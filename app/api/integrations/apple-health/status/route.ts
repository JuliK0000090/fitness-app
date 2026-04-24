import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  try {
    const session = await requireSession();
    const userId = session.userId;

    const integration = await db.healthIntegration.findUnique({
      where: { userId },
    });

    if (!integration) return NextResponse.json({ connected: false });

    const daysOfHistory = await db.haeDaily.count({ where: { userId } });

    return NextResponse.json({
      connected: integration.active && !!integration.lastPayloadAt,
      active: integration.active,
      lastPayloadAt: integration.lastPayloadAt,
      totalPayloadCount: integration.totalPayloadCount,
      daysOfHistory,
    });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
