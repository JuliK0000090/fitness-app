import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.userId, deletedAt: null },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(conversation);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["title", "pinned"];
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const conversation = await prisma.conversation.updateMany({
    where: { id, userId: session.userId },
    data,
  });
  return NextResponse.json({ ok: true, count: conversation.count });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  await prisma.conversation.updateMany({
    where: { id, userId: session.userId },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
