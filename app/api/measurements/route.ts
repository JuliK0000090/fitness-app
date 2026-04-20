import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { predictHitDate } from "@/lib/goal-engine";

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
  const body = await req.json();

  const m = await prisma.measurement.create({
    data: { ...body, userId: session.userId },
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
