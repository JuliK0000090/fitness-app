import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { predictHitDate } from "@/lib/goal-engine";
import { z } from "zod";

const measurementSchema = z.object({
  kind: z.string().min(1),
  value: z.number(),
  unit: z.string().optional().default("cm"),
  capturedAt: z.string().datetime().optional(),
  source: z.enum(["manual", "photo_estimate", "wearable"]).optional().default("manual"),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = req.nextUrl;
  const kind = searchParams.get("kind") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const measurements = await prisma.measurement.findMany({
    where: { userId: session.userId, ...(kind ? { kind } : {}) },
    orderBy: { capturedAt: "desc" },
    take: limit,
  });
  return NextResponse.json(measurements);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const parsed = measurementSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const m = await prisma.measurement.create({
    data: { ...parsed.data, userId: session.userId },
  });

  // After measurement save, update goal predictions async (fire-and-forget)
  const userId = session.userId;
  prisma.goal.findMany({ where: { userId, status: "active" } })
    .then((goals) =>
      Promise.all(
        goals.map((g) =>
          predictHitDate(userId, g.id)
            .then((date) =>
              date
                ? prisma.goal.update({
                    where: { id: g.id },
                    data: { predictedHitDate: date },
                  })
                : null
            )
            .catch(() => null)
        )
      )
    )
    .catch(() => null);

  return NextResponse.json(m);
}
