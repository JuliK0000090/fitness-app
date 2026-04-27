import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchBody = z.object({
  reason: z.string().min(1).optional(),
  scope: z.enum(["HARD", "SOFT", "ADVISORY"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  payload: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await ctx.params;
  const body = PatchBody.parse(await req.json());

  const existing = await prisma.plannerConstraint.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.plannerConstraint.update({
    where: { id },
    data: {
      ...(body.reason !== undefined && { reason: body.reason }),
      ...(body.scope !== undefined && { scope: body.scope }),
      ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.payload !== undefined && { payload: body.payload as object }),
      ...(body.active !== undefined && {
        active: body.active,
        resolvedAt: body.active ? null : new Date(),
      }),
    },
  });
  return NextResponse.json({ constraint: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await ctx.params;
  const existing = await prisma.plannerConstraint.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.plannerConstraint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
