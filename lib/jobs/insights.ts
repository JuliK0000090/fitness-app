/**
 * Insight Moments runner — Inngest function
 *
 * Runs at 7 AM user-local time (approximated as 7 AM UTC for now;
 * production should use per-timezone scheduling via event-driven approach).
 *
 * Evaluates all 10 insight rules, picks the highest-priority one
 * that hasn't hit its cooldown, fires it as a Notification.
 */

import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { INSIGHTS_BY_PRIORITY } from "@/lib/coach/insights";
import type { InsightContext } from "@/lib/coach/insights";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const runInsightMoments = inngest.createFunction(
  {
    id: "insight-moments",
    triggers: [{ cron: "0 7 * * *" }],
    concurrency: { limit: 5 },
  },
  async ({ step }: { step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const users = await step.run("fetch-users", async () => {
      return prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true },
      });
    });

    for (const user of users) {
      await step.run(`insights-${user.id}`, async () => {
        await evaluateInsights(user.id);
      });
    }
  }
);

/** Evaluate insights for a single user and fire at most one. */
export async function evaluateInsights(userId: string): Promise<string | null> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Load all context data in parallel
  const [
    healthRows,
    habitCompletionDays,
    habitList,
    workoutsLast14,
    glp1Profile,
    nutritionLogs,
    firedLogs,
    avatarEvents,
    recentMessages,
    openDays,
    goalData,
  ] = await Promise.all([
    prisma.healthDaily.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "desc" },
    }),
    prisma.dailyLedger.findMany({
      where: { userId, date: { gte: sevenDaysAgo }, allComplete: true },
      orderBy: { date: "desc" },
    }),
    prisma.habit.findMany({ where: { userId, active: true }, select: { id: true, title: true } }),
    prisma.scheduledWorkout.findMany({
      where: { userId, scheduledDate: { gte: fourteenDaysAgo } },
    }),
    db.gLP1Profile.findUnique({ where: { userId } }).catch(() => null),
    db.nutritionLog.findMany({
      where: { userId, date: { gte: new Date(new Date().setDate(today.getDate() - 3)) } },
      orderBy: { date: "desc" },
    }).catch(() => []),
    db.insightFiredLog.findMany({
      where: { userId, firedAt: { gte: thirtyDaysAgo } },
      orderBy: { firedAt: "desc" },
    }).catch(() => []),
    db.avatarEvent.findFirst({
      where: { userId, date: { gte: today } },
      orderBy: { date: "asc" },
    }).catch(() => null),
    prisma.message.findMany({
      where: {
        conversation: { userId },
        role: "user",
        createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }).catch(() => []),
    prisma.notification.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }).catch(() => []),
    prisma.goal.findFirst({
      where: { userId, status: "active" },
      orderBy: { priority: "asc" },
      select: { title: true, deadline: true, currentValue: true, targetValue: true, startValue: true },
    }).catch(() => null),
  ]);

  // Build per-metric daily arrays
  const metricByDay = new Map<string, Map<string, number>>();
  for (const row of healthRows) {
    const dateStr = row.date.toISOString().split("T")[0];
    if (!metricByDay.has(row.metric)) metricByDay.set(row.metric, new Map());
    metricByDay.get(row.metric)!.set(dateStr, row.value);
  }

  function getMetricLast7(metric: string): number[] {
    const m = metricByDay.get(metric);
    if (!m) return [];
    const out: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const v = m.get(d.toISOString().split("T")[0]);
      if (v !== undefined) out.push(v);
    }
    return out;
  }

  function getMedian(vals: number[]): number | null {
    if (vals.length === 0) return null;
    const sorted = [...vals].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  const readinessLast7 = getMetricLast7("readinessScore");
  const readinessAll = Array.from(metricByDay.get("readinessScore")?.values() ?? []);
  const readinessBaseline = getMedian(readinessAll);
  const restingHrLast7 = getMetricLast7("heartRateResting");
  const hrvLast7 = getMetricLast7("hrvMs");
  const hrvAll = Array.from(metricByDay.get("hrvMs")?.values() ?? []);
  const hrvBaseline = getMedian(hrvAll);
  const sleepHoursLast7 = getMetricLast7("sleepHours");

  // Resting HR trend
  const restingHrTrend: "rising" | "falling" | "stable" =
    restingHrLast7.length >= 5
      ? restingHrLast7[0] > restingHrLast7[4] + 3
        ? "rising"
        : restingHrLast7[0] < restingHrLast7[4] - 3
          ? "falling"
          : "stable"
      : "stable";

  // Consecutive all-habits days
  let consecutiveAllHabitsDays = 0;
  const sortedAllComplete = habitCompletionDays.map((d) => d.date.toISOString().split("T")[0]).sort().reverse();
  for (let i = 0; i < sortedAllComplete.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (sortedAllComplete[i] === expected.toISOString().split("T")[0]) {
      consecutiveAllHabitsDays++;
    } else break;
  }

  // Workout completion rate last 14 days
  const planned14 = workoutsLast14.filter((w) => w.status !== "MOVED").length;
  const done14 = workoutsLast14.filter((w) => w.status === "DONE").length;
  const workoutCompletionLast14 = planned14 > 0 ? done14 / planned14 : 1;

  // GLP-1 protein avg last 3 days
  const proteinLogs = (nutritionLogs as Array<{ proteinG: number | null }>).filter((l) => l.proteinG !== null);
  const glp1ProteinAvg3DayG =
    proteinLogs.length > 0
      ? proteinLogs.slice(0, 3).reduce((a, l) => a + (l.proteinG ?? 0), 0) / Math.min(3, proteinLogs.length)
      : null;

  // Upcoming event
  const upcomingEventDaysOut = avatarEvents
    ? Math.round((new Date(avatarEvents.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Goal trajectory deviation (positive = behind)
  let goalTrajectoryDeviationPct: number | null = null;
  if (goalData?.deadline && goalData.targetValue !== null && goalData.startValue !== null && goalData.currentValue !== null) {
    const totalRange = Math.abs((goalData.targetValue ?? 0) - (goalData.startValue ?? 0));
    if (totalRange > 0) {
      const totalDays = (new Date(goalData.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      const completedPct = Math.abs(((goalData.currentValue ?? 0) - (goalData.startValue ?? 0)) / totalRange);
      const expectedPct = Math.max(0, 1 - totalDays / 180);
      goalTrajectoryDeviationPct = (expectedPct - completedPct) * 100;
    }
  }

  // Recent user message topics
  const recentUserTopics = (recentMessages as Array<{ content: string }>).map((m) =>
    typeof m.content === "string" ? m.content : ""
  );
  const userMentionedTiredOrHeavy = recentUserTopics.some((t) =>
    ["tired", "heavy", "sluggish", "off", "low energy", "exhausted"].some((kw) => t.toLowerCase().includes(kw))
  );
  const userAskedForMoreWorkouts = recentUserTopics.some((t) =>
    ["add another", "more session", "extra workout", "harder", "more workouts"].some((kw) => t.toLowerCase().includes(kw))
  );

  // Consecutive open days (proxy via notifications/openDays)
  const consecutiveOpenDays = openDays.length; // rough approximation

  // Calendar deadline event this week
  const hasDeadlineEventThisWeek = recentUserTopics.some((t) =>
    ["deadline", "launch", "presentation", "demo", "flight", "trip"].some((kw) => t.toLowerCase().includes(kw))
  );

  const ctx: InsightContext = {
    userId,
    readinessLast7,
    readinessBaseline,
    restingHrLast7,
    restingHrTrend,
    sleepHoursLast7,
    hrvLast7,
    hrvBaseline,
    consecutiveAllHabitsDays,
    sameDayHabitMissRate: new Map(),
    workoutCompletionLast14,
    goalTrajectoryDeviationPct,
    goalDeadline: goalData?.deadline ?? null,
    goalTitle: goalData?.title ?? null,
    glp1Active: glp1Profile?.active ?? false,
    glp1ProteinTargetG: glp1Profile?.proteinTargetG ?? null,
    glp1ProteinAvg3DayG,
    glp1Medication: glp1Profile?.medication ?? null,
    upcomingEventName: avatarEvents?.title ?? null,
    upcomingEventDaysOut,
    hasDeadlineEventThisWeek,
    calendarEventTitle: recentUserTopics.find((t) =>
      ["deadline", "launch", "presentation"].some((kw) => t.toLowerCase().includes(kw))
    ) ?? null,
    consecutiveOpenDays,
    recentUserTopics,
    userMentionedTiredOrHeavy,
    userAskedForMoreWorkouts,
    weakestWeekdayHabitId: null,
    weakestWeekdayName: null,
    weakestHabitTitle: habitList[0]?.title ?? null,
  };

  // Evaluate insights in priority order, check cooldowns
  const firedInsightIds = new Set<string>(
    (firedLogs as Array<{ insightId: string; firedAt: Date }>).map((l) => `${l.insightId}-${l.firedAt.toISOString()}`)
  );

  for (const insight of INSIGHTS_BY_PRIORITY) {
    // Check cooldown
    const recentFire = (firedLogs as Array<{ insightId: string; firedAt: Date }>).find(
      (l) => l.insightId === insight.id
    );
    if (recentFire) {
      const daysSinceFire =
        (today.getTime() - new Date(recentFire.firedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceFire < insight.cooldownDays) continue;
    }

    // Check trigger
    let triggered = false;
    try {
      triggered = insight.triggerCheck(ctx);
    } catch {
      continue;
    }
    if (!triggered) continue;

    // Generate message
    let message;
    try {
      message = insight.generateMessage(ctx);
    } catch {
      continue;
    }

    // Fire: create notification and log
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: "insight_moment",
          title: `From Vita`,
          body: message.text,
          data: JSON.stringify({ insightId: insight.id, insightName: insight.name }),
        },
      });

      await db.insightFiredLog.create({
        data: {
          userId,
          insightId: insight.id,
          firedAt: today,
          contextSnapshot: {
            readinessLast7,
            hrvLast7,
            consecutiveAllHabitsDays,
            glp1Active: ctx.glp1Active,
          },
        },
      });

      void firedInsightIds; // suppress unused warning
      return insight.id;
    } catch (e) {
      console.error("[insights] fire error:", e);
    }

    break; // at most one per day
  }

  return null;
}
