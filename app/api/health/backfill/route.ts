import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTerraActivity } from "@/lib/terra";
import { processHealthRaw } from "@/lib/health/process";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { terraUserId, provider } = await req.json().catch(() => ({}));

  const device = await prisma.device.findFirst({
    where: { userId: session.userId, terraUserId },
  });

  if (!device?.terraUserId) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Fire and forget
  (async () => {
    try {
      const data = await getTerraActivity(device.terraUserId!, startDate, endDate);
      const raw = await prisma.healthRaw.create({
        data: {
          userId: session.userId,
          provider: (provider ?? device.provider).toUpperCase(),
          eventType: "activity",
          payload: data as object,
        },
      });
      await processHealthRaw(raw.id, session.userId, device.provider.toUpperCase(), "activity", data as Record<string, unknown>);
    } catch (e) {
      console.error("Backfill error:", e);
    }
  })();

  return NextResponse.json({ ok: true, message: "Backfill started" });
}
