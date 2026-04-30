/**
 * Diagnostic for the rollover + accuracy bugs (April 30 2026).
 *
 * Read-only. Returns JSON describing:
 *   - The user's local "today" / "yesterday" interpretation
 *   - HabitCompletion rows for today and yesterday — what shows in /today
 *   - HaeMetric rows for steps grouped by (date, source) — the inputs to
 *     the rollup
 *   - HaeDaily / HealthDaily for today — what the dashboard reads
 *   - The three plausible reconstructions (sum / max / sum-across-sources)
 *     so we can prove which one HealthDaily currently equals
 *
 *   GET /api/admin/diagnose-integrity        → diagnose own user
 *   GET /api/admin/diagnose-integrity?email= → diagnose another (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userToday, userYesterday, userTodayStr } from "@/lib/time/today";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const SOURCE_PRIORITY = ["apple_health", "garmin", "oura", "whoop", "fitbit", "manual"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!me || !ADMIN_EMAILS.includes(me.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetEmail = req.nextUrl.searchParams.get("email") ?? me.email;
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { id: true, email: true, timezone: true },
  });
  if (!user) return NextResponse.json({ error: "user not found", targetEmail }, { status: 404 });

  const tz = user.timezone ?? "America/Toronto";
  const today = userToday(tz);
  const yesterday = userYesterday(tz);

  // Server UTC's idea of today (the buggy path) — for proving the difference
  const serverUtcDateStr = new Date().toISOString().split("T")[0];
  const serverUtcDate = new Date(serverUtcDateStr + "T00:00:00.000Z");

  const userLocalNowStr = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date());

  // ── Habit completions for today and yesterday ─────────────────────────────
  const habits = await prisma.habit.findMany({
    where: { userId: user.id, active: true },
    select: { id: true, title: true, trackingMode: true, cadence: true, specificDays: true },
  });

  const completions = await prisma.habitCompletion.findMany({
    where: {
      userId: user.id,
      date: { in: [today, yesterday, serverUtcDate] },
    },
    select: { habitId: true, date: true, status: true, completedAt: true, source: true },
    orderBy: [{ date: "desc" }, { completedAt: "desc" }],
  });

  const habitTitleById = new Map(habits.map((h) => [h.id, h.title ?? "(untitled)"]));
  const completionsByDate = (date: Date) => completions
    .filter((c) => c.date.getTime() === date.getTime())
    .map((c) => ({
      habitId: c.habitId,
      title: habitTitleById.get(c.habitId) ?? "(?)",
      status: c.status,
      source: c.source,
      completedAt: c.completedAt?.toISOString() ?? null,
    }));

  // ── Step rollup reconstruction (HaeMetric → expected HaeDaily/HealthDaily) ─
  const stepMetrics = await db.haeMetric.findMany({
    where: {
      userId: user.id,
      metricType: "steps",
      date: { in: [today, yesterday] },
    },
    select: { date: true, source: true, value: true, recordedAt: true },
    orderBy: { recordedAt: "desc" },
  });

  type Stats = { rows: number; sum: number; max: number; latest: number };
  const reconstruct = (forDate: Date) => {
    const forDateMs = forDate.getTime();
    const bySource = new Map<string, Stats>();
    let latestRecordedAt: Date | null = null;
    for (const m of stepMetrics) {
      if (m.date.getTime() !== forDateMs) continue;
      const s = m.source as string;
      const v = m.value as number;
      const cur = bySource.get(s) ?? { rows: 0, sum: 0, max: 0, latest: 0 };
      cur.rows++;
      cur.sum += v;
      cur.max = Math.max(cur.max, v);
      cur.latest = v;
      bySource.set(s, cur);
      if (!latestRecordedAt || m.recordedAt > latestRecordedAt) latestRecordedAt = m.recordedAt;
    }
    let winningSource: string | null = null;
    for (const s of SOURCE_PRIORITY) {
      if (bySource.has(s)) { winningSource = s; break; }
    }
    if (!winningSource && bySource.size > 0) winningSource = Array.from(bySource.keys())[0];
    const w = winningSource ? bySource.get(winningSource)! : null;
    const sumAcrossAll = Array.from(bySource.values()).reduce((a, s) => a + s.sum, 0);
    return {
      bySource: Array.from(bySource.entries()).map(([source, stats]) => ({ source, ...stats })),
      winningSource,
      sumFromWinning: w?.sum ?? null,
      maxFromWinning: w?.max ?? null,
      latestFromWinning: w?.latest ?? null,
      sumAcrossAllSources: sumAcrossAll,
      latestRecordedAt: latestRecordedAt ? (latestRecordedAt as Date).toISOString() : null,
    };
  };

  const todayReconstruct = reconstruct(today);
  const yesterdayReconstruct = reconstruct(yesterday);

  // What the storage tables currently hold
  const haeDaily = await db.haeDaily.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
    select: { steps: true, stepsSource: true, exerciseMinutes: true, distanceKm: true, updatedAt: true },
  });

  const healthDailySteps = await prisma.healthDaily.findUnique({
    where: { userId_date_metric: { userId: user.id, date: today, metric: "steps" } },
    select: { value: true, source: true, computedAt: true },
  });

  // Pipeline freshness
  const lastRaw = await db.haeRaw.findFirst({
    where: { userId: user.id },
    orderBy: { receivedAt: "desc" },
    select: { receivedAt: true, processed: true, processedAt: true, error: true },
  });
  const unprocessedCount = await db.haeRaw.count({
    where: { userId: user.id, processed: false },
  });

  // Bug verdict on steps
  const stepsInDailyHae = haeDaily?.steps ?? null;
  const stepsInHealthDaily = healthDailySteps?.value ?? null;
  const expectedSum = todayReconstruct.sumFromWinning;
  const observedMax = todayReconstruct.maxFromWinning;

  let stepsBugVerdict = "unknown";
  if (expectedSum !== null && stepsInDailyHae !== null) {
    if (Math.abs(stepsInDailyHae - expectedSum) <= 5) stepsBugVerdict = "MATCHES_SUM (correct)";
    else if (observedMax !== null && Math.abs(stepsInDailyHae - observedMax) <= 5) stepsBugVerdict = "MATCHES_MAX (BUG: aggregating max instead of sum)";
    else if (stepsInDailyHae < expectedSum * 0.5) stepsBugVerdict = "FAR_LOW (probably max-of-bucket bug)";
    else stepsBugVerdict = "OTHER_MISMATCH";
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, timezone: tz },
    clock: {
      serverUtcNow: new Date().toISOString(),
      userLocalNow: userLocalNowStr,
      userTodayStr: userTodayStr(tz),
      userTodayUTC: today.toISOString(),
      userYesterdayUTC: yesterday.toISOString(),
      serverUtcDateUTC: serverUtcDate.toISOString(),
      serverDateLeaksIntoUserToday: serverUtcDate.getTime() !== today.getTime(),
    },
    habits: {
      activeCount: habits.length,
      todayCompletions: completionsByDate(today),
      yesterdayCompletions: completionsByDate(yesterday),
      serverUtcDateCompletions: completionsByDate(serverUtcDate),
      bug1Hint:
        serverUtcDate.getTime() !== today.getTime() && completionsByDate(serverUtcDate).length > 0
          ? "BUG 1 LIKELY: completions exist on the server-UTC date (different from user-today). vita-tools.todayStr() uses UTC, so habits tapped late at night get the wrong date."
          : "no leak detected via this check (still may exist via other paths)",
    },
    steps: {
      today: {
        reconstruction: todayReconstruct,
        haeDaily: { steps: stepsInDailyHae, source: haeDaily?.stepsSource ?? null, updatedAt: haeDaily?.updatedAt?.toISOString() ?? null },
        healthDaily: { value: stepsInHealthDaily, source: healthDailySteps?.source ?? null, computedAt: healthDailySteps?.computedAt?.toISOString() ?? null },
        verdict: stepsBugVerdict,
      },
      yesterday: { reconstruction: yesterdayReconstruct },
    },
    pipeline: {
      lastPayloadAt: lastRaw?.receivedAt?.toISOString() ?? null,
      lastPayloadProcessed: lastRaw?.processed ?? null,
      lastError: lastRaw?.error ?? null,
      unprocessedCount,
    },
  });
}
