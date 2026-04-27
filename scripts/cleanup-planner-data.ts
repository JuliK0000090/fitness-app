/**
 * Idempotent cleanup of impossible planner data:
 *
 *   1. HabitCompletion rows with date > today → delete (a habit cannot be
 *      completed on a day that hasn't happened).
 *   2. ScheduledWorkout rows with date > today AND status indicating
 *      completion (DONE / SKIPPED / MISSED / AUTO_SKIPPED) → reset to
 *      PLANNED, clear completedAt, workoutLogId, pointsEarned.
 *
 * Both run inside one transaction so the DB never sees a partial cleanup.
 *
 * Usage:
 *   npx tsx scripts/cleanup-planner-data.ts --dry-run   # report only
 *   npx tsx scripts/cleanup-planner-data.ts             # actually mutate
 *
 * Connect to prod by passing DATABASE_URL via env, e.g.:
 *   DATABASE_URL=$(railway variables --service Postgres --json | jq -r .DATABASE_PUBLIC_URL) \
 *     npx tsx scripts/cleanup-planner-data.ts --dry-run
 *
 * Calibration to actual schema:
 *   - WorkoutStatus values: PLANNED | DONE | SKIPPED | MOVED | MISSED | AUTO_SKIPPED
 *     (no COMPLETED — that exists only in the spec)
 *
 * Note: this script is harmless once the Phase 2 CHECK constraints are in
 * place — there will be nothing to clean up. Kept for emergency recovery.
 */

import { prisma } from "../lib/prisma";
import { WorkoutStatus } from "@prisma/client";

const DRY = process.argv.includes("--dry-run");

const TOMORROW_START = (() => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
})();

const COMPLETION_STATUSES: WorkoutStatus[] = ["DONE", "SKIPPED", "MISSED", "AUTO_SKIPPED"];

function bar() { console.log("─".repeat(72)); }

async function main() {
  bar();
  console.log(`Cleanup planner data — ${DRY ? "DRY RUN" : "LIVE"}`);
  console.log(`TOMORROW_START (UTC): ${TOMORROW_START.toISOString()}`);
  bar();

  // 1. HabitCompletion rows with date in the future
  const futureCompletions = await prisma.habitCompletion.findMany({
    where: { date: { gte: TOMORROW_START } },
    select: { id: true, userId: true, habitId: true, date: true, status: true },
  });
  console.log(`\n[1/2] HabitCompletion rows with future date: ${futureCompletions.length}`);
  if (futureCompletions.length > 0) {
    const byUser = new Map<string, number>();
    for (const r of futureCompletions) {
      byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + 1);
    }
    for (const [userId, n] of byUser) {
      console.log(`     user=${userId.slice(0, 8)}: ${n} row${n > 1 ? "s" : ""}`);
    }
  }

  // 2. ScheduledWorkout rows in the future with a completion-flavoured status
  const futureCompletedWorkouts = await prisma.scheduledWorkout.findMany({
    where: {
      scheduledDate: { gte: TOMORROW_START },
      status: { in: COMPLETION_STATUSES },
    },
    select: {
      id: true, userId: true, scheduledDate: true, status: true,
      workoutTypeName: true, completedAt: true, workoutLogId: true, pointsEarned: true,
    },
  });
  console.log(`\n[2/2] ScheduledWorkout rows with future date AND completion status: ${futureCompletedWorkouts.length}`);
  if (futureCompletedWorkouts.length > 0) {
    const byUser = new Map<string, number>();
    for (const r of futureCompletedWorkouts) {
      byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + 1);
    }
    for (const [userId, n] of byUser) {
      console.log(`     user=${userId.slice(0, 8)}: ${n} row${n > 1 ? "s" : ""}`);
    }
  }

  if (futureCompletions.length === 0 && futureCompletedWorkouts.length === 0) {
    console.log("\nNothing to clean up. ✓");
    return;
  }

  if (DRY) {
    console.log("\n[DRY RUN] no changes written. Re-run without --dry-run to apply.");
    return;
  }

  console.log("\nApplying cleanup in a single transaction…");
  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.habitCompletion.deleteMany({
      where: { date: { gte: TOMORROW_START } },
    });
    const updated = await tx.scheduledWorkout.updateMany({
      where: {
        scheduledDate: { gte: TOMORROW_START },
        status: { in: COMPLETION_STATUSES },
      },
      data: {
        status: "PLANNED",
        completedAt: null,
        workoutLogId: null,
        pointsEarned: 0,
      },
    });
    return { habitCompletionsDeleted: deleted.count, scheduledWorkoutsReset: updated.count };
  });

  console.log(`  HabitCompletion rows deleted:  ${result.habitCompletionsDeleted}`);
  console.log(`  ScheduledWorkout rows reset:   ${result.scheduledWorkoutsReset}`);
  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(2); })
  .finally(async () => { await prisma.$disconnect(); });
