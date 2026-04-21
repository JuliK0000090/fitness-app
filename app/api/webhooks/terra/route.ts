import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest";

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify Terra signature
  const signingSecret = process.env.TERRA_SIGNING_SECRET ?? process.env.TERRA_WEBHOOK_SECRET;
  if (signingSecret) {
    const signature = req.headers.get("terra-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    // Terra uses HMAC-SHA256
    const { createHmac } = await import("crypto");
    const raw = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    const expected = createHmac("sha256", signingSecret).update(body).digest("hex");
    if (raw !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = String(payload.type ?? payload.event_type ?? "unknown");
  const terraUser = payload.user as Record<string, unknown> | undefined;
  const terraUserId = String(terraUser?.user_id ?? payload.user_id ?? "");
  const provider = String(terraUser?.provider ?? payload.provider ?? "UNKNOWN");

  // Find our user via Device.terraUserId
  let userId: string | null = null;
  if (terraUserId) {
    const device = await prisma.device.findFirst({
      where: { terraUserId },
      select: { userId: true },
    });
    userId = device?.userId ?? null;
  }

  // Also handle auth events to set up Device
  if (eventType === "auth" || eventType === "user_auth_success") {
    const referenceId = String(terraUser?.reference_id ?? payload.reference_id ?? "");
    if (referenceId && terraUserId) {
      await prisma.device.upsert({
        where: { userId_provider: { userId: referenceId, provider: provider.toUpperCase() } },
        create: {
          userId: referenceId,
          provider: provider.toUpperCase(),
          terraUserId,
          connected: true,
          status: "CONNECTED",
        },
        update: {
          terraUserId,
          connected: true,
          status: "CONNECTED",
          lastSyncAt: new Date(),
        },
      });
      userId = referenceId;
    }
  }

  // Handle deauth
  if (eventType === "deauth" || eventType === "user_deauth") {
    if (terraUserId) {
      await prisma.device.updateMany({
        where: { terraUserId },
        data: { connected: false, status: "DISCONNECTED" },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (!userId) {
    return NextResponse.json({ ok: true, note: "no user found" });
  }

  // Store raw payload
  const raw = await prisma.healthRaw.create({
    data: {
      userId,
      provider: provider.toUpperCase(),
      eventType,
      payload: payload as object,
    },
  });

  // Enqueue normalization
  if (process.env.INNGEST_EVENT_KEY) {
    await inngest.send({
      name: "health/raw.received",
      data: { rawId: raw.id, userId, provider: provider.toUpperCase(), eventType },
    });
  } else {
    // Direct normalization if no Inngest
    const { processHealthRaw } = await import("@/lib/health/process");
    await processHealthRaw(raw.id, userId, provider.toUpperCase(), eventType, payload).catch(console.error);
  }

  // Update device last sync
  await prisma.device.updateMany({
    where: { userId, provider: provider.toUpperCase() },
    data: { lastSyncAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
