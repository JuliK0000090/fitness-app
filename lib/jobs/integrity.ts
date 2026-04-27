/**
 * Hourly data-integrity sweep.
 *
 * Fires the audit-script checks against the live DB and logs anything
 * that violates the planner-health invariants:
 *   1. No HabitCompletion rows with date > today
 *   2. No ScheduledWorkout DONE/SKIPPED/MISSED/AUTO_SKIPPED on future dates
 *   3. Every user with active WeeklyTargets has at least
 *      (sum of targetCount - 1) PLANNED workouts in each of the next 8 weeks
 *
 * The first two cannot occur after Phase 2's CHECK constraints landed; this
 * sweep exists as a belt-and-braces alarm in case a constraint is ever
 * dropped, or in case a deploy hits the DB before the migration runs.
 *
 * Issues are logged at error level so Railway's log search can find them.
 * No DB table is written to today; if needed later, add a DataIntegrityIssue
 * model and write rows here.
 */

import { addWeeks } from "date-fns";
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

export const dataIntegritySweep = inngest.createFunction(
  {
    id: "data-integrity-sweep",
    triggers: [{ cron: "0 * * * *" }], // hourly
  },
  async ({ step }) => {
    const issues: string[] = [];

    // 1. Future-dated HabitCompletion rows
    const futureCompletions = await step.run("check-future-completions", async () => {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(start.getUTCDate() + 1);
      return prisma.habitCompletion.count({ where: { date: { gte: start } } });
    });
    if (futureCompletions > 0) {
      issues.push(`${futureCompletions} HabitCompletion row(s) with future dates`);
    }

    // 2. Future-dated DONE/SKIPPED/MISSED/AUTO_SKIPPED ScheduledWorkout rows
    const futureCompleted = await step.run("check-future-completed-workouts", async () => {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(start.getUTCDate() + 1);
      return prisma.scheduledWorkout.count({
        where: {
          scheduledDate: { gte: start },
          status: { in: ["DONE", "SKIPPED", "MISSED", "AUTO_SKIPPED"] },
        },
      });
    });
    if (futureCompleted > 0) {
      issues.push(`${futureCompleted} ScheduledWorkout row(s) with future date AND completion status`);
    }

    // 3. Per-user weekly horizon shortfall check
    const userShortfalls = await step.run("check-per-user-horizon", async () => {
      const users = await prisma.user.findMany({
        where: {
          deletedAt: null,
          weeklyTargets: { some: { active: true } },
        },
        select: {
          id: true,
          weeklyTargets: { where: { active: true }, select: { targetCount: true } },
        },
      });

      const horizonStart = utcMondayOfWeek(new Date());
      const out: string[] = [];

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
            out.push(
              `user=${user.id.slice(0, 8)} week ${w} ` +
              `(${ws.toISOString().split("T")[0]}): ${count} planned, expected ~${expected}`,
            );
          }
        }
      }
      return out;
    });
    issues.push(...userShortfalls);

    if (issues.length > 0) {
      console.error("[planner-health] integrity sweep found issues:");
      for (const i of issues) console.error("  -", i);
    }

    return { issuesFound: issues.length, issues };
  },
);

export const integrityFunctions = [dataIntegritySweep];
