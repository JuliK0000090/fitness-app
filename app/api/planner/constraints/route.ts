import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildConstraintFromTreatment, TREATMENT_KEYS } from "@/lib/coach/constraints";

const CreateBody = z.object({
  treatmentKey: z.enum(TREATMENT_KEYS as [string, ...string[]]).optional(),
  type: z.enum([
    "TREATMENT", "INJURY", "ILLNESS", "TRAVEL",
    "SCHEDULE_BLACKOUT", "ACTIVITY_RESTRICTION", "PREFERENCE",
    "CYCLE_PHASE", "RECOVERY_REQUIREMENT",
  ]).optional(),
  scope: z.enum(["HARD", "SOFT", "ADVISORY"]).default("HARD"),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  payload: z.record(z.unknown()).optional(),
  reason: z.string().min(1),
});

export async function GET() {
  const session = await requireSession();
  const constraints = await prisma.plannerConstraint.findMany({
    where: { userId: session.userId },
    orderBy: [{ active: "desc" }, { startDate: "desc" }],
  });
  return NextResponse.json({ constraints });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = CreateBody.parse(await req.json());

  let createData: Parameters<typeof prisma.plannerConstraint.create>[0]["data"];

  if (body.treatmentKey) {
    const built = buildConstraintFromTreatment({
      treatmentKey: body.treatmentKey,
      startDate: new Date(body.startDate),
    });
    createData = {
      userId: session.userId,
      type: built.type,
      scope: body.scope,
      startDate: built.startDate,
      endDate: body.endDate ? new Date(body.endDate) : built.endDate,
      payload: built.payload as object,
      reason: body.reason || built.reason,
      source: "manual_settings",
    };
  } else {
    if (!body.type) {
      return NextResponse.json({ error: "type or treatmentKey is required" }, { status: 400 });
    }
    createData = {
      userId: session.userId,
      type: body.type,
      scope: body.scope,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      payload: (body.payload ?? {}) as object,
      reason: body.reason,
      source: "manual_settings",
    };
  }

  const c = await prisma.plannerConstraint.create({ data: createData });
  return NextResponse.json({ constraint: c });
}
