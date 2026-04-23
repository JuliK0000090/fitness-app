import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json();

  // Validate ownership first
  const existing = await prisma.goal.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const allowedStatuses = ["active", "achieved", "paused", "archived"] as const;
  type GoalStatus = (typeof allowedStatuses)[number];

  const updateData: { status?: GoalStatus } = {};

  if (body.status !== undefined) {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${allowedStatuses.join(", ")}` },
        { status: 400 }
      );
    }
    updateData.status = body.status as GoalStatus;
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(goal);
}
