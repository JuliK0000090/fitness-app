/**
 * 8-week rolling planner regenerator.
 *
 * Rebuilds future PLANNED ScheduledWorkout rows from active WeeklyTarget
 * rows. Idempotent — running it twice produces the same result.
 *
 * Critical invariants (in priority order):
 *   1. NEVER touch rows with status DONE / SKIPPED / MOVED — these are
 *      historical truth or explicit user decisions.
 *   2. NEVER touch rows on past dates.
 *   3. NEVER touch rows where userEdited=true on future dates — the user
 *      manually placed those.
 *   4. CAN delete and recreate rows with status PLANNED on future dates
 *      that the planner generated (source != "manual" or "imported").
 *   5. After deletion, re-create the week's quota using the existing
 *      validate-then-commit safeScheduleWorkout, which respects the per-day
 *      caps and active PlannerConstraints.
 *
 * Triggers:
 *   - Goal create/update              — caller invokes regenerate(userId)
 *   - WeeklyTarget add/remove/change  — caller invokes regenerate(userId)
 *   - PlannerConstraint added         — replanFromConstraint already moves
 *                                       blocked workouts; regenerate then
 *                                       re-fills any week that fell short.
 *   - Daily 02:00 UTC Inngest cron    — keeps the rolling 8-week horizon fresh.
 *   - Manual user button              — POST /api/planner/regenerate
 */

import { addDays, addWeeks } from "date-fns";
import { prisma } from "../prisma";
import { safeScheduleWorkout } from "./schedule";
import { findBlockingConstraint } from "./constraints";

/**
 * UTC-based Monday-of-week. date-fns's startOfWeek uses local time, which
 * makes the planner horizon drift by a week depending on which timezone the
 * server is running in. ScheduledWorkout.scheduledDate is @db.Date (UTC),
 * so all horizon math must also be UTC.
 */
function utcMondayOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  const day = out.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Mon
  out.setUTCDate(out.getUTCDate() + diff);
  return out;
}

export const HORIZON_WEEKS = 8;

export type RegenerateResult = {
  weeksProcessed: number;
  workoutsDeleted: number;
  workoutsCreated: number;
  shortfalls: Array<{ week: number; workoutType: string; created: number; expected: number }>;
};

/**
 * Day-of-week priority order for placing N occurrences.
 * Returns a list of all 7 weekday offsets (Mon=0..Sun=6) where the first
 * `count` are evenly spread (the preferred placements) and the remaining
 * are the fallback fill order. The regenerator walks this whole list so
 * a week's quota gets filled even if the preferred days are taken by
 * another workout type.
 */
function dayPriorityOrder(count: number): number[] {
  if (count <= 0) return [0, 1, 2, 3, 4, 5, 6];
  const gap = Math.floor(7 / Math.max(1, count));
  const preferred: number[] = [];
  for (let i = 0; i < count; i++) preferred.push((i * gap) % 7);
  const fallback = [0, 1, 2, 3, 4, 5, 6].filter((d) => !preferred.includes(d));
  return [...new Set([...preferred, ...fallback])];
}

function midnightUTC(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

export async function regenerateUserPlan(userId: string): Promise<RegenerateResult> {
  const today = midnightUTC(new Date());
  const tomorrow = addDays(today, 1);

  const targets = await prisma.weeklyTarget.findMany({
    where: { userId, active: true },
    select: {
      id: true, workoutTypeId: true, workoutTypeName: true,
      targetCount: true, goalId: true,
    },
  });
  if (targets.length === 0) {
    return { weeksProcessed: 0, workoutsDeleted: 0, workoutsCreated: 0, shortfalls: [] };
  }

  // Active constraints — used for shortfall reporting; safeScheduleWorkout
  // handles them on a per-write basis, but we want to know if a week was
  // unfillable because of a constraint.
  const constraints = await prisma.plannerConstraint.findMany({
    where: { userId, active: true },
  });

  const horizonStart = utcMondayOfWeek(today);
  const horizonEnd = addWeeks(horizonStart, HORIZON_WEEKS);

  // Step 1: delete planner-generated future PLANNED rows that weren't
  // user-edited. We keep MOVED + DONE + SKIPPED + MISSED + AUTO_SKIPPED
  // rows untouched, and we keep userEdited=true rows untouched.
  const deleted = await prisma.scheduledWorkout.deleteMany({
    where: {
      userId,
      scheduledDate: { gte: tomorrow, lt: horizonEnd },
      status: "PLANNED",
      userEdited: false,
      source: { in: ["ai_suggested", "manual"] }, // keep "imported" workouts intact
    },
  });

  let created = 0;
  const shortfalls: RegenerateResult["shortfalls"] = [];

  // Step 2: for each week in the horizon, reconstruct the quota.
  for (let w = 0; w < HORIZON_WEEKS; w++) {
    const weekStart = addWeeks(horizonStart, w);

    for (const target of targets) {
      const days = dayPriorityOrder(target.targetCount);

      // What's already on this week for this workout type? (DONE / SKIPPED /
      // MOVED / userEdited PLANNED — anything we did not just delete.)
      const existing = await prisma.scheduledWorkout.findMany({
        where: {
          userId,
          scheduledDate: { gte: weekStart, lt: addWeeks(weekStart, 1) },
          OR: [
            { workoutTypeId: target.workoutTypeId },
            { workoutTypeName: target.workoutTypeName },
          ],
        },
      });
      const alreadyHave = existing.length;
      const needed = Math.max(0, target.targetCount - alreadyHave);

      let placed = 0;
      for (const dayOffset of days) {
        if (placed >= needed) break;
        const candidate = addDays(weekStart, dayOffset);
        if (candidate < tomorrow) continue; // never write into past or today

        // Skip days that already have a same-type workout (for this target).
        if (existing.some((e) => sameDay(e.scheduledDate, candidate))) continue;

        const outcome = await safeScheduleWorkout({
          userId,
          goalId: target.goalId ?? null,
          workoutTypeId: target.workoutTypeId,
          workoutTypeName: target.workoutTypeName ?? "Workout",
          scheduledDate: candidate,
          duration: 45,
          source: "ai_suggested",
        });
        if (outcome.scheduledWorkout) {
          placed++;
          created++;
        }
      }

      if (placed + alreadyHave < target.targetCount) {
        // Was every preferred + fallback day in this week constraint-blocked?
        const blockedAll = days.every((d) =>
          findBlockingConstraint(
            { workoutTypeName: target.workoutTypeName, scheduledDate: addDays(weekStart, d) },
            constraints,
          ) !== null,
        );
        shortfalls.push({
          week: w,
          workoutType: target.workoutTypeName ?? "?",
          created: placed + alreadyHave,
          expected: target.targetCount,
          ...(blockedAll ? { reason: "all-days-blocked-by-constraint" } : {}),
        } as RegenerateResult["shortfalls"][number]);
      }
    }
  }

  return {
    weeksProcessed: HORIZON_WEEKS,
    workoutsDeleted: deleted.count,
    workoutsCreated: created,
    shortfalls,
  };
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
