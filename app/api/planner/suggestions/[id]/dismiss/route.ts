import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await ctx.params;
  const existing = await prisma.chatSuggestion.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.chatSuggestion.update({ where: { id }, data: { dismissed: true } });
  return NextResponse.json({ ok: true });
}
