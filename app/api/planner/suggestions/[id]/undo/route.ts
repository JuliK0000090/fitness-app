import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({ constraintId: z.string() });

/**
 * Undo a re-plan suggestion: deactivates the constraint so the user can edit
 * it on /settings/constraints. Workouts that were already moved stay moved —
 * we don't second-guess the schedule, but the constraint will no longer apply
 * to future plans.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await ctx.params;
  const body = Body.parse(await req.json());

  const suggestion = await prisma.chatSuggestion.findFirst({
    where: { id, userId: session.userId },
  });
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const constraint = await prisma.plannerConstraint.findFirst({
    where: { id: body.constraintId, userId: session.userId },
  });
  if (!constraint) return NextResponse.json({ error: "Constraint not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.plannerConstraint.update({
      where: { id: constraint.id },
      data: { active: false, resolvedAt: new Date() },
    }),
    prisma.chatSuggestion.update({
      where: { id: suggestion.id },
      data: { dismissed: true, appliedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
