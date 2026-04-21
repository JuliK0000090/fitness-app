import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const KEY_METRICS = ["steps", "activeMinutes", "caloriesActive", "sleepHours", "sleepEfficiency", "hrvMs", "restingHr", "readinessScore", "recoveryScore", "weightKg"];

export async function GET() {
  const session = await requireSession();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Today's activity metrics
  const todayRows = await prisma.healthDaily.findMany({
    where: { userId: session.userId, date: today, metric: { in: KEY_METRICS } },
  });

  // Sleep is from "last night" = yesterday's date in Terra
  const sleepRows = await prisma.healthDaily.findMany({
    where: {
      userId: session.userId,
      date: yesterday,
      metric: { in: ["sleepHours", "sleepEfficiency", "hrvMs", "restingHr"] },
    },
  });

  const result: Record<string, { value: number; unit: string; source: string; trust: number; sources: unknown }> = {};

  for (const row of [...todayRows, ...sleepRows]) {
    if (!result[row.metric]) {
      result[row.metric] = {
        value: row.value,
        unit: row.unit,
        source: row.source,
        trust: row.trust,
        sources: row.sources,
      };
    }
  }

  return NextResponse.json(result);
}
