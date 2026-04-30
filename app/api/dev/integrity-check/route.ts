/**
 * Self-test endpoint for the rollover + accuracy invariants.
 *
 * Returns a single JSON document with three verdicts:
 *   - habitsCorrect: rollover is fresh (lastRolloverDate == userToday)
 *   - stepsCorrect: HealthDaily steps == sum of today's HaeMetric step
 *     samples from the highest-priority source
 *   - pipelineHealthy: < 3 unprocessed HaeRaw payloads
 *
 * GET /api/dev/integrity-check          → run for the signed-in user
 * GET /api/dev/integrity-check?email=…  → admin-only override
 *
 * No writes. Safe to hit repeatedly.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userToday, userYesterday, userTodayStr } from "@/lib/time/today";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const SOURCE_PRIORITY = ["apple_health", "garmin", "oura", "whoop", "fitbit", "manual"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(req: NextRequest) {
  const session = await requireSession();

  // Admin override
  let userId = session.userId;
  const emailParam = req.nextUrl.searchParams.get("email");
  if (emailParam) {
    const me = await prisma.user.findUnique({
      where: { id: session.userId }, select: { email: true },
    });
    if (!me || !ADMIN_EMAILS.includes(me.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const target = await prisma.user.findUnique({
      where: { email: emailParam }, select: { id: true },
    });
    if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });
    userId = target.id;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, timezone: true,
      lastRolloverDate: true,
    },
  });
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const tz = user.timezone || "America/Toronto";
  const today = userToday(tz);
  const yesterday = userYesterday(tz);
  const todayStr = userTodayStr(tz);

  // Habit state ────────────────────────────────────────────────────────────
  const habits = await prisma.habit.findMany({
    where: { userId, active: true },
    select: { id: true, title: true, trackingMode: true },
  });
  const todayCompletions = await prisma.habitCompletion.findMany({
    where: { userId, date: today },
    select: { habitId: true, status: true, source: true, completedAt: true },
  });
  const yesterdayCompletions = await prisma.habitCompletion.findMany({
    where: { userId, date: yesterday },
    select: { habitId: true, status: true, source: true, completedAt: true },
  });
  const completionByHabitToday = new Map(todayCompletions.map((c) => [c.habitId, c]));
  const completionByHabitYesterday = new Map(yesterdayCompletions.map((c) => [c.habitId, c]));
  const habitState = habits.map((h) => ({
    title: h.title,
    today: completionByHabitToday.get(h.id)?.status ?? "NOT_DONE",
    yesterday: completionByHabitYesterday.get(h.id)?.status ?? "NO_RECORD",
  }));
  const lastRolloverIso = (user as { lastRolloverDate: Date | null }).lastRolloverDate
    ? new Date((user as { lastRolloverDate: Date | null }).lastRolloverDate as Date).toISOString().split("T")[0]
    : null;
  const rolloverFresh = lastRolloverIso === todayStr;

  // Step accuracy ──────────────────────────────────────────────────────────
  const stepRows = await db.haeMetric.findMany({
    where: { userId, date: today, metricType: "steps" },
    select: { source: true, value: true },
  });
  const bySource = new Map<string, number>();
  for (const r of stepRows as { source: string; value: number }[]) {
    bySource.set(r.source, (bySource.get(r.source) ?? 0) + r.value);
  }
  let winningSource: string | null = null;
  for (const s of SOURCE_PRIORITY) {
    if (bySource.has(s)) { winningSource = s; break; }
  }
  if (!winningSource && bySource.size > 0) winningSource = Array.from(bySource.keys())[0];
  const reconstructedSteps = winningSource ? Math.round(bySource.get(winningSource)!) : 0;

  const haeDaily = await db.haeDaily.findUnique({
    where: { userId_date: { userId, date: today } },
    select: { steps: true, stepsSource: true, updatedAt: true },
  });
  const healthDailySteps = await prisma.healthDaily.findUnique({
    where: { userId_date_metric: { userId, date: today, metric: "steps" } },
    select: { value: true, source: true, computedAt: true },
  });

  const stepsInVita = haeDaily?.steps ?? null;
  const stepsAccurate = stepsInVita !== null
    ? Math.abs(stepsInVita - reconstructedSteps) <= 5
    : reconstructedSteps === 0; // both null/zero = "no data yet" = vacuously OK

  // Pipeline ───────────────────────────────────────────────────────────────
  const lastRaw = await db.haeRaw.findFirst({
    where: { userId },
    orderBy: { receivedAt: "desc" },
    select: { receivedAt: true, processed: true },
  });
  const unprocessedCount = await db.haeRaw.count({
    where: { userId, processed: false },
  });

  const verdict = {
    habitsCorrect: rolloverFresh,
    stepsCorrect: stepsAccurate,
    pipelineHealthy: unprocessedCount < 3,
    allGood: rolloverFresh && stepsAccurate && unprocessedCount < 3,
  };

  return NextResponse.json({
    timezone: tz,
    today: todayStr,

    habits: {
      total: habits.length,
      doneToday: todayCompletions.filter((c) => c.status === "DONE").length,
      missedToday: todayCompletions.filter((c) => c.status === "MISSED").length,
      state: habitState,
      rolloverFresh,
      lastRolloverDate: lastRolloverIso,
    },

    health: {
      stepsInVita,
      stepsReconstructed: reconstructedSteps,
      winningSource,
      sourcesPresent: Array.from(bySource.entries()).map(([s, v]) => ({ source: s, sum: Math.round(v) })),
      stepsInHealthDaily: healthDailySteps?.value ?? null,
      lastUpdated: haeDaily?.updatedAt?.toISOString() ?? null,
      stepsAccurate,
    },

    pipeline: {
      lastPayloadAt: lastRaw?.receivedAt?.toISOString() ?? null,
      lastPayloadProcessed: lastRaw?.processed ?? null,
      unprocessedCount,
    },

    verdict,
  });
}
