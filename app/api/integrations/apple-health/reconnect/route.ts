import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { generateWebhookToken, getOrCreateIntegration } from "@/lib/health/token";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function POST() {
  try {
    const session = await requireSession();
    const userId = session.userId;

    const integration = await db.healthIntegration.findUnique({ where: { userId } });
    if (!integration) {
      await getOrCreateIntegration(userId);
      return NextResponse.json({ ok: true });
    }

    await db.healthIntegration.update({
      where: { userId },
      data: {
        active: true,
        webhookToken: generateWebhookToken(),
        totalPayloadCount: 0,
        lastPayloadAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
