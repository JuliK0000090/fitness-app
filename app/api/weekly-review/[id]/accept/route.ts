import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const review = await prisma.weeklyReview.findUnique({ where: { id } });
  if (!review || review.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.weeklyReview.update({
    where: { id },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
