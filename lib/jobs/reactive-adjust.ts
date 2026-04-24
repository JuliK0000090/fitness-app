/**
 * Inngest function: Reactive plan adjustment engine
 *
 * Triggered nightly (or by health.daily.updated event).
 * Loads each user's recent health signals, runs all 8 reactive rules,
 * applies high-confidence proposals automatically, queues medium/low as ChatSuggestion.
 */

import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { runReactiveRules } from "@/lib/coach/reactive";
import type { HealthSignal, ScheduledBlock, UserContext } from "@/lib/coach/reactive";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const runReactiveAdjustments = inngest.createFunction(
  {
    id: "reactive-adjustments",
    triggers: [
      { cron: "0 23 * * *" }, // nightly at 11 PM UTC
      { event: "health/daily.updated" },
    ],
    concurrency: { limit: 5 },
  },
  async ({ event, step }: { event: { data?: { userId?: string } }; step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const targetUserId = event?.data?.userId;

    const users = await step.run("fetch-users", async () => {
      return prisma.user.findMany({
        where: {
          deletedAt: null,
          onboardingComplete: true,
          ...(targetUserId ? { id: targetUserId } : {}),
        },
        select: { id: true, timezone: true },
      });
    });

    for (const user of users) {
      await step.run(`adjust-${user.id}`, async () => {
        await processUserReactive(user.id);
      });
    }
  }
);

async function processUserReactive(userId: string): Promise<void> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch all required data in parallel
  const [rawHealthSignals, todayRaw, tomorrowRaw, glp1Profile, recentWorkouts, last14Workouts, habitDays] =
    await Promise.all([
      // Health signals last 30 days
      prisma.healthDaily.findMany({
        where: { userId, date: { gte: thirtyDaysAgo } },
        orderBy: { date: "desc" },
      }),
      // Today's scheduled blocks
      prisma.scheduledWorkout.findMany({
        where: { userId, scheduledDate: new Date(todayStr) },
      }),
      // Tomorrow's scheduled blocks
      prisma.scheduledWorkout.findMany({
        where: { userId, scheduledDate: new Date(tomorrowStr) },
      }),
      // GLP-1 profile
      db.gLP1Profile.findUnique({ where: { userId } }).catch(() => null),
      // Last 7 days resistance sessions (done)
      prisma.scheduledWorkout.findMany({
        where: {
          userId,
          status: "DONE",
          scheduledDate: { gte: sevenDaysAgo },
          workoutTypeName: { in: ["Strength Training", "Reformer Pilates", "Barre", "HIIT", "Weight Training"] },
        },
      }),
      // Last 14 days workouts (all statuses)
      prisma.scheduledWorkout.findMany({
        where: { userId, scheduledDate: { gte: fourteenDaysAgo } },
      }),
      // All-habits-complete days
      prisma.dailyLedger.findMany({
        where: { userId, date: { gte: sevenDaysAgo }, allComplete: true },
      }),
    ]);

  // Pivot HealthDaily rows into per-day signal objects
  const signalMap = new Map<string, HealthSignal>();
  for (const row of rawHealthSignals) {
    const dateStr = row.date.toISOString().split("T")[0];
    if (!signalMap.has(dateStr)) signalMap.set(dateStr, { date: dateStr });
    const s = signalMap.get(dateStr)!;
    if (row.metric === "readinessScore") s.readinessScore = row.value;
    if (row.metric === "sleepHours") s.sleepHours = row.value;
    if (row.metric === "hrvMs") s.hrvMs = row.value;
    if (row.metric === "heartRateResting") s.heartRateResting = row.value;
    if (row.metric === "steps") s.steps = row.value;
  }
  const healthSignals = Array.from(signalMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  // Compute derived signals
  const todaySignal = signalMap.get(todayStr);
  const todayReadiness = todaySignal?.readinessScore ?? null;

  // Consecutive short nights (< 6.5 h)
  let consecutiveShortNights = 0;
  for (const s of healthSignals) {
    if ((s.sleepHours ?? 10) < 6.5) consecutiveShortNights++;
    else break;
  }

  // Resting HR spike: >7 bpm above 30-day median
  const restingHrs = healthSignals
    .map((s) => s.heartRateResting)
    .filter((v): v is number => v !== null && v !== undefined);
  let restingHrSpike = false;
  if (restingHrs.length >= 5) {
    const sorted = [...restingHrs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const recentAvg = restingHrs.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, restingHrs.length);
    restingHrSpike = recentAvg > median + 7;
  }

  // Completion rate last 14 days
  const planned14 = last14Workouts.filter((w) => w.status !== "MOVED").length;
  const done14 = last14Workouts.filter((w) => w.status === "DONE").length;
  const completionRateLast14Days = planned14 > 0 ? done14 / planned14 : 1;

  // All-habits consecutive days
  const allHabitsConsecutiveDays = habitDays.length;

  const mapBlock = (w: typeof todayRaw[0]): ScheduledBlock => ({
    id: w.id,
    date: w.scheduledDate.toISOString().split("T")[0],
    workoutTypeName: w.workoutTypeName,
    intensity: w.intensity,
    status: w.status,
  });

  const ctx: UserContext = {
    userId,
    healthSignals,
    todayBlocks: todayRaw.map(mapBlock),
    tomorrowBlocks: tomorrowRaw.map(mapBlock),
    glp1Active: glp1Profile?.active ?? false,
    glp1ResistanceTarget: glp1Profile?.resistanceMinTarget ?? 150,
    lastSevenDayResistanceSessions: recentWorkouts.length,
    completionRateLast14Days,
    consecutiveShortNights,
    restingHrSpike,
    allHabitsConsecutiveDays,
    todayReadiness,
  };

  const proposals = runReactiveRules(ctx);
  if (proposals.length === 0) return;

  for (const proposal of proposals) {
    if (proposal.autoApply && proposal.proposedChange.blockId) {
      // Apply immediately: move or lighten the block
      try {
        const { blockId, action, toDate, intensityChange } = proposal.proposedChange;
        if (action === "MOVE" && toDate) {
          await prisma.scheduledWorkout.update({
            where: { id: blockId! },
            data: { scheduledDate: new Date(toDate), status: "MOVED" },
          });
        } else if (action === "LIGHTEN" && intensityChange) {
          const block = await prisma.scheduledWorkout.findUnique({ where: { id: blockId! } });
          if (block) {
            await prisma.scheduledWorkout.update({
              where: { id: blockId! },
              data: { intensity: Math.max(1, (block.intensity ?? 5) + intensityChange) },
            });
          }
        } else if (action === "SKIP") {
          await prisma.scheduledWorkout.update({
            where: { id: blockId! },
            data: { status: "SKIPPED", skippedReason: "reactive_auto_skip" },
          });
        }

        // Log the adjustment
        await db.reactiveAdjustmentLog.create({
          data: {
            userId,
            ruleName: proposal.ruleName,
            trigger: proposal.trigger,
            payload: proposal as object,
          },
        });

        // Notify user via Notification
        await prisma.notification.create({
          data: {
            userId,
            type: "reactive_adjustment",
            title: "I made a change today",
            body: proposal.proposedChange.rationale,
            data: JSON.stringify({ proposalId: proposal.id, ruleName: proposal.ruleName }),
          },
        });
      } catch (e) {
        console.error("[reactive] auto-apply error:", e);
      }
    } else if (!proposal.autoApply) {
      // Surface as ChatSuggestion for user to accept/dismiss
      try {
        await prisma.chatSuggestion.create({
          data: {
            userId,
            type: "REACTIVE_ADJUSTMENT",
            title: "Plan adjustment ready",
            body: proposal.proposedChange.rationale,
          },
        });
      } catch (e) {
        console.error("[reactive] chatsuggestion error:", e);
      }
    }
  }
}
