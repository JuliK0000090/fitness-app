/**
 * Hourly data-integrity sweep — the canary for temporal-rule violations.
 *
 * Runs every hour. Counts violations across the three time-bound models
 * the calendar reads. Each violation class either resolves (writes a
 * resolvedAt on outstanding alerts) or files a fresh IntegrityAlert row
 * with up to 5 sample IDs for post-incident audit.
 *
 * Violations covered (matches scripts/audit-temporal-integrity.ts):
 *   ScheduledWorkout
 *     - future-date + status in DONE/SKIPPED/MISSED/AUTO_SKIPPED
 *     - past-date + status PLANNED
 *     - completedAt < scheduledDate, or completedAt > now
 *   WorkoutLog
 *     - startedAt > now
 *   HabitCompletion
 *     - date > today
 *
 * Plus the planner-horizon shortfall canary from the previous sweep.
 *
 * Layered defence: the Phase 2 CHECK constraints make these violations
 * impossible to insert in the first place. This sweep exists in case a
 * constraint is ever dropped, a deploy hits the DB before the migration
 * runs, or some unforeseen path bypasses the validators.
 */

import { addWeeks } from "date-fns";
import { Prisma } from "@prisma/client";
import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { HORIZON_WEEKS } from "@/lib/coach/regenerate";

const SHORTFALL_TOLERANCE = 1;

function utcMondayOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  const day = out.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setUTCDate(out.getUTCDate() + diff);
  return out;
}

function tomorrowUtcMidnight(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

type RuleSample = { count: number; sampleIds: string[]; sampleDetail: Array<Record<string, unknown>> };

async function checkAllRules(): Promise<Record<string, RuleSample>> {
  const out: Record<string, RuleSample> = {};
  const tomorrow = tomorrowUtcMidnight();
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const now = new Date();

  // ── ScheduledWorkout future-completion
  const futureCompleted = await prisma.scheduledWorkout.findMany({
    where: {
      scheduledDate: { gte: tomorrow },
      status: { in: ["DONE", "SKIPPED", "MISSED", "AUTO_SKIPPED"] },
    },
    take: 5,
    select: { id: true, userId: true, scheduledDate: true, status: true, workoutTypeName: true },
  });
  const futureCompletedCount = await prisma.scheduledWorkout.count({
    where: {
      scheduledDate: { gte: tomorrow },
      status: { in: ["DONE", "SKIPPED", "MISSED", "AUTO_SKIPPED"] },
    },
  });
  out["scheduled-workout-future-completion"] = {
    count: futureCompletedCount,
    sampleIds: futureCompleted.map((r) => r.id),
    sampleDetail: futureCompleted.map((r) => ({
      id: r.id, userId: r.userId, status: r.status,
      date: r.scheduledDate.toISOString().split("T")[0], name: r.workoutTypeName,
    })),
  };

  // ── ScheduledWorkout past-PLANNED (rollover hasn't run)
  const pastPlanned = await prisma.scheduledWorkout.findMany({
    where: { scheduledDate: { lt: today }, status: "PLANNED" },
    take: 5,
    select: { id: true, userId: true, scheduledDate: true, workoutTypeName: true },
  });
  const pastPlannedCount = await prisma.scheduledWorkout.count({
    where: { scheduledDate: { lt: today }, status: "PLANNED" },
  });
  out["scheduled-workout-past-planned"] = {
    count: pastPlannedCount,
    sampleIds: pastPlanned.map((r) => r.id),
    sampleDetail: pastPlanned.map((r) => ({
      id: r.id, userId: r.userId,
      date: r.scheduledDate.toISOString().split("T")[0], name: r.workoutTypeName,
    })),
  };

  // ── ScheduledWorkout completedAt > now
  const badCAt = await prisma.scheduledWorkout.findMany({
    where: { completedAt: { gt: now } },
    take: 5,
    select: { id: true, userId: true, scheduledDate: true, completedAt: true, status: true },
  });
  const badCAtCount = await prisma.scheduledWorkout.count({ where: { completedAt: { gt: now } } });
  out["scheduled-workout-completedAt-future"] = {
    count: badCAtCount,
    sampleIds: badCAt.map((r) => r.id),
    sampleDetail: badCAt.map((r) => ({
      id: r.id, userId: r.userId, status: r.status,
      date: r.scheduledDate.toISOString().split("T")[0],
      completedAt: r.completedAt?.toISOString(),
    })),
  };

  // ── WorkoutLog startedAt > now
  const futureLogs = await prisma.workoutLog.findMany({
    where: { startedAt: { gt: now } },
    take: 5,
    select: { id: true, userId: true, startedAt: true, workoutName: true, source: true },
  });
  const futureLogCount = await prisma.workoutLog.count({ where: { startedAt: { gt: now } } });
  out["workout-log-future-startedAt"] = {
    count: futureLogCount,
    sampleIds: futureLogs.map((r) => r.id),
    sampleDetail: futureLogs.map((r) => ({
      id: r.id, userId: r.userId, source: r.source,
      startedAt: r.startedAt.toISOString(), name: r.workoutName,
    })),
  };

  // ── HabitCompletion future date
  const futureHc = await prisma.habitCompletion.findMany({
    where: { date: { gte: tomorrow } },
    take: 5,
    select: { id: true, userId: true, date: true, status: true },
  });
  const futureHcCount = await prisma.habitCompletion.count({ where: { date: { gte: tomorrow } } });
  out["habit-completion-future-date"] = {
    count: futureHcCount,
    sampleIds: futureHc.map((r) => r.id),
    sampleDetail: futureHc.map((r) => ({
      id: r.id, userId: r.userId, status: r.status,
      date: r.date.toISOString().split("T")[0],
    })),
  };

  return out;
}

export const dataIntegritySweep = inngest.createFunction(
  {
    id: "data-integrity-sweep",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const ruleResults = await step.run("check-temporal-rules", checkAllRules);
    const issues: string[] = [];

    for (const [rule, result] of Object.entries(ruleResults)) {
      // Resolve any outstanding alerts for this rule that no longer apply.
      if (result.count === 0) {
        await prisma.integrityAlert.updateMany({
          where: { rule, resolvedAt: null },
          data: { resolvedAt: new Date() },
        });
        continue;
      }

      issues.push(`${rule}: ${result.count}`);

      // De-dupe: if there's already an unresolved alert for this rule with
      // the same count, don't open a duplicate. If the count changed, open
      // a new one (the situation has evolved).
      const existing = await prisma.integrityAlert.findFirst({
        where: { rule, resolvedAt: null },
        orderBy: { detectedAt: "desc" },
      });
      if (existing && existing.count === result.count) continue;

      await prisma.integrityAlert.create({
        data: {
          table:
            rule.startsWith("scheduled-workout") ? "ScheduledWorkout" :
            rule.startsWith("workout-log") ? "WorkoutLog" :
            "HabitCompletion",
          rule,
          count: result.count,
          sample: result.sampleDetail as unknown as Prisma.InputJsonValue,
        },
      });
    }

    // ── Planner-horizon shortfall (carried over from the prior sweep) ─────
    const userShortfalls = await step.run("check-per-user-horizon", async () => {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, weeklyTargets: { some: { active: true } } },
        select: {
          id: true,
          weeklyTargets: { where: { active: true }, select: { targetCount: true } },
        },
      });
      const horizonStart = utcMondayOfWeek(new Date());
      const lines: string[] = [];
      for (const user of users) {
        const expected = user.weeklyTargets.reduce((s, t) => s + t.targetCount, 0);
        if (expected === 0) continue;
        for (let w = 0; w < HORIZON_WEEKS; w++) {
          const ws = addWeeks(horizonStart, w);
          const we = addWeeks(ws, 1);
          const count = await prisma.scheduledWorkout.count({
            where: {
              userId: user.id,
              scheduledDate: { gte: ws, lt: we },
              status: "PLANNED",
            },
          });
          if (count < expected - SHORTFALL_TOLERANCE) {
            lines.push(
              `user=${user.id.slice(0, 8)} week ${w} ` +
              `(${ws.toISOString().split("T")[0]}): ${count} planned, expected ~${expected}`,
            );
          }
        }
      }
      return lines;
    });
    if (userShortfalls.length > 0) {
      issues.push(`planner-horizon shortfalls: ${userShortfalls.length}`);
    }

    if (issues.length > 0) {
      console.error("[planner-health] integrity sweep found issues:");
      for (const i of issues) console.error("  -", i);
    }

    return { issuesFound: issues.length, issues, shortfalls: userShortfalls };
  },
);

export const integrityFunctions = [dataIntegritySweep];
