import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { format, subDays } from "date-fns";

// ─── Nightly rollup: populate DailyLedger for yesterday ───────────────────────
export const rollupDaily = inngest.createFunction(
  { id: "rollup-daily", triggers: [{ cron: "5 0 * * *" }] },
  async () => {
    const yesterday = subDays(new Date(), 1);
    const yesterdayDate = new Date(format(yesterday, "yyyy-MM-dd"));

    const activeUsers = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    for (const { id: userId } of activeUsers) {
      try {
        const [habits, completions, workoutsPlanned, workoutsDone] = await Promise.all([
          prisma.habit.count({ where: { userId, active: true } }),
          prisma.habitCompletion.count({ where: { userId, date: yesterdayDate } }),
          prisma.scheduledWorkout.count({ where: { userId, scheduledDate: yesterdayDate } }),
          prisma.scheduledWorkout.count({ where: { userId, scheduledDate: yesterdayDate, status: "DONE" } }),
        ]);

        const points = completions * 10 + workoutsDone * 50;
        const allComplete = habits > 0 && completions >= habits && workoutsPlanned === workoutsDone;

        await prisma.dailyLedger.upsert({
          where: { userId_date: { userId, date: yesterdayDate } },
          create: { userId, date: yesterdayDate, habitsCompleted: completions, habitsTotal: habits, workoutsDone, workoutsPlanned, points, allComplete },
          update: { habitsCompleted: completions, habitsTotal: habits, workoutsDone, workoutsPlanned, points, allComplete },
        });
      } catch (e) {
        console.error(`[rollupDaily] userId=${userId}`, e);
      }
    }
  }
);

// ─── Update streaks after rollup ──────────────────────────────────────────────
export const updateStreaks = inngest.createFunction(
  { id: "update-streaks", triggers: [{ cron: "15 0 * * *" }] },
  async () => {
    const users = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, bestStreak: true } });

    for (const user of users) {
      try {
        let current = 0;
        let checkDate = subDays(new Date(), 1);

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const ledger = await prisma.dailyLedger.findUnique({
            where: { userId_date: { userId: user.id, date: new Date(format(checkDate, "yyyy-MM-dd")) } },
          });
          if (!ledger || !ledger.allComplete) break;
          current++;
          checkDate = subDays(checkDate, 1);
          if (current > 1000) break;
        }

        const best = Math.max(current, user.bestStreak);
        await prisma.user.update({ where: { id: user.id }, data: { currentStreak: current, bestStreak: best } });
      } catch (e) {
        console.error(`[updateStreaks] userId=${user.id}`, e);
      }
    }
  }
);

// ─── Predict goal trajectory (linear regression) ─────────────────────────────
export const predictTrajectory = inngest.createFunction(
  { id: "predict-trajectory", triggers: [{ cron: "30 1 * * *" }] },
  async () => {
    const goals = await prisma.goal.findMany({
      where: { status: "active", targetMetric: { not: null }, targetValue: { not: null } },
      include: {
        measurements: {
          orderBy: { capturedAt: "asc" },
          take: 90,
        },
      },
    });

    for (const goal of goals) {
      if (!goal.targetMetric || !goal.targetValue) continue;
      const relevantMeasurements = goal.measurements.filter((m) => m.kind === goal.targetMetric);
      if (relevantMeasurements.length < 3) continue;

      try {
        const t0 = relevantMeasurements[0].capturedAt.getTime();
        const xs = relevantMeasurements.map((m) => (m.capturedAt.getTime() - t0) / 86400000);
        const ys = relevantMeasurements.map((m) => m.value);
        const n = xs.length;
        const sumX = xs.reduce((a, b) => a + b, 0);
        const sumY = ys.reduce((a, b) => a + b, 0);
        const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
        const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
        const denom = n * sumX2 - sumX * sumX;
        if (Math.abs(denom) < 1e-10) continue;
        const slope = (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;
        if (Math.abs(slope) < 1e-10) continue;
        const daysToTarget = (goal.targetValue - intercept) / slope;
        if (daysToTarget < 0 || !isFinite(daysToTarget) || daysToTarget > 5 * 365) continue;
        const predictedDate = new Date(t0 + daysToTarget * 86400000);
        const latest = relevantMeasurements[relevantMeasurements.length - 1].value;
        await prisma.goal.update({ where: { id: goal.id }, data: { predictedHitDate: predictedDate, currentValue: latest } });
      } catch (e) {
        console.error(`[predictTrajectory] goalId=${goal.id}`, e);
      }
    }
  }
);

export const ledgerFunctions = [rollupDaily, updateStreaks, predictTrajectory];
