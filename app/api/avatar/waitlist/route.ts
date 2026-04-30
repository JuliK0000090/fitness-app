import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireSession();
  await prisma.avatarWaitlist.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await requireSession();
  const row = await prisma.avatarWaitlist.findUnique({
    where: { userId: session.userId },
    select: { joinedAt: true },
  });
  return NextResponse.json({ onList: !!row, joinedAt: row?.joinedAt ?? null });
}
