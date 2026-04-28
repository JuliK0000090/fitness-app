import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await ctx.params;

  // Only the user the encouragement is FOR can mark it read.
  const enc = await prisma.partnerEncouragement.findUnique({
    where: { id },
    include: { partner: true },
  });
  if (!enc || enc.partner.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!enc.readAt) {
    await prisma.partnerEncouragement.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
