import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metric: z.string().min(1),
  value: z.number(),
  unit: z.string().default(""),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = schema.parse(await req.json());

  const date = new Date(body.date);

  // Create override
  await prisma.healthOverride.upsert({
    where: { userId_date_metric: { userId: session.userId, date, metric: body.metric } },
    create: { userId: session.userId, date, metric: body.metric, value: body.value, unit: body.unit, note: body.note },
    update: { value: body.value, note: body.note },
  });

  // Update HealthDaily to reflect override
  await prisma.healthDaily.upsert({
    where: { userId_date_metric: { userId: session.userId, date, metric: body.metric } },
    create: {
      userId: session.userId,
      date,
      metric: body.metric,
      value: body.value,
      unit: body.unit,
      source: "MANUAL",
      sources: {},
      trust: 100,
      overridden: true,
    },
    update: {
      value: body.value,
      source: "MANUAL",
      overridden: true,
      trust: 100,
      computedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
