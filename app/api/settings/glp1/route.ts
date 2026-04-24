import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  active: z.boolean().optional(),
  medication: z.string().nullable().optional(),
  startedOn: z.string().nullable().optional(),
  doseSchedule: z.string().nullable().optional(),
  proteinTargetG: z.number().int().nullable().optional(),
  resistanceMinTarget: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  const session = await requireSession();
  const profile = await prisma.gLP1Profile.findUnique({
    where: { userId: session.userId },
  });
  return NextResponse.json(profile ?? { active: false });
}

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  const body = updateSchema.parse(await req.json());

  const data: Record<string, unknown> = {};
  if (body.active !== undefined) data.active = body.active;
  if (body.medication !== undefined) data.medication = body.medication;
  if (body.startedOn !== undefined) data.startedOn = body.startedOn ? new Date(body.startedOn) : null;
  if (body.doseSchedule !== undefined) data.doseSchedule = body.doseSchedule;
  if (body.proteinTargetG !== undefined) data.proteinTargetG = body.proteinTargetG;
  if (body.resistanceMinTarget !== undefined) data.resistanceMinTarget = body.resistanceMinTarget;
  if (body.notes !== undefined) data.notes = body.notes;

  const profile = await prisma.gLP1Profile.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, ...data },
    update: data,
  });

  // Keep User.onGlp1 in sync
  if (body.active !== undefined) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { onGlp1: body.active },
    });
  }

  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest) {
  return PUT(req);
}
