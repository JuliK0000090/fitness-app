import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireSession();
  const conversations = await prisma.conversation.findMany({
    where: { userId: session.userId, deletedAt: null },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true, title: true, pinned: true, createdAt: true, updatedAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, role: true } },
    },
  });
  return NextResponse.json(conversations);
}

export async function POST() {
  const session = await requireSession();
  const conversation = await prisma.conversation.create({
    data: { userId: session.userId },
  });
  return NextResponse.json(conversation);
}
