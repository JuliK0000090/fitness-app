import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { rotateWebhookToken } from "@/lib/health/token";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function POST() {
  try {
    const session = await requireSession();
    const userId = session.userId;

    const integration = await db.healthIntegration.findUnique({ where: { userId } });
    if (!integration) return NextResponse.json({ ok: true });

    // Deactivate and rotate token so old URL is dead
    await db.healthIntegration.update({
      where: { userId },
      data: {
        active: false,
        webhookToken: (await rotateWebhookToken(userId)).webhookToken,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
