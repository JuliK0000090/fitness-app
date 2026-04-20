import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id: messageId } = await params;
  const { rating, comment } = await req.json();

  await prisma.messageFeedback.upsert({
    where: { messageId_userId: { messageId, userId: session.userId } } as never,
    create: { messageId, userId: session.userId, rating, comment },
    update: { rating, comment },
  });
  return NextResponse.json({ ok: true });
}
