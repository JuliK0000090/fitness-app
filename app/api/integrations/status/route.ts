import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const devices = await prisma.device.findMany({
    where: { userId: session.userId },
    select: {
      id: true,
      provider: true,
      connected: true,
      connectedAt: true,
      lastSyncAt: true,
    },
    orderBy: { connectedAt: "desc" },
  });

  return NextResponse.json({ devices });
}
