import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.checklistItem.update({
    where: { id },
    data: { doneAt: new Date() },
  });

  return NextResponse.json({ item: updated });
}
