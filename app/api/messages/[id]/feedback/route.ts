import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await requireSession(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: messageId } = await params;
  const { rating, comment } = await req.json();

  // Upsert — unique([messageId, userId]) enforced in schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.messageFeedback as any).upsert({
    where: { messageId_userId: { messageId, userId: session.userId } },
    create: { messageId, userId: session.userId, rating, comment },
    update: { rating, comment },
  });
  return NextResponse.json({ ok: true });
}
