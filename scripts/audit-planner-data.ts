/**
 * Read-only audit of planner data integrity.
 *
 * Run: npx tsx scripts/audit-planner-data.ts
 *
 * Reports — does not modify any rows.
 *
 * Calibration to actual schema:
 *   - WorkoutStatus values: PLANNED | DONE | SKIPPED | MOVED | MISSED | AUTO_SKIPPED
 *     (no COMPLETED, no SUGGESTED — those exist only in the spec)
 *   - HabitCompletion.status: DONE | MISSED | SKIPPED | PENDING
 *   - Calendar route is /month
 */

import { prisma } from "../lib/prisma";
import { addWeeks, format, startOfWeek, endOfWeek } from "date-fns";

const TODAY_END = (() => {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
})();
const TOMORROW_START = (() => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
})();

function bar() { console.log("─".repeat(72)); }
function header(s: string) { bar(); console.log(s); bar(); }

async function main() {
  console.log("Audit started", new Date().toISOString());
  console.log(`TODAY_END (UTC):       ${TODAY_END.toISOString()}`);
  console.log(`TOMORROW_START (UTC):  ${TOMORROW_START.toISOString()}`);
  console.log("");

  // ── 1. HabitCompletion rows with date > today ──────────────────────────────
  header("1. HabitCompletion rows with date in the future");
  const futureCompletionCount = await prisma.habitCompletion.count({
    where: { date: { gte: TOMORROW_START } },
  });
  console.log(`Total: ${futureCompletionCount}`);

  if (futureCompletionCount > 0) {
    const sample = await prisma.habitCompletion.findMany({
      where: { date: { gte: TOMORROW_START } },
      orderBy: { date: "asc" },
      take: 10,
      select: {
        id: true, habitId: true, userId: true, date: true,
        status: true, source: true, completedAt: true,
      },
    });
    console.log("\nSample (up to 10):");
    for (const r of sample) {
      console.log(
        `  ${r.id} habit=${r.habitId} user=${r.userId.slice(0, 8)} ` +
        `date=${r.date.toISOString().split("T")[0]} status=${r.status} ` +
        `source=${r.source} completedAt=${r.completedAt?.toISOString() ?? "null"}`,
      );
    }
  }
  console.log("");

  // ── 2. ScheduledWorkout rows with date > today AND status indicating completion
  header("2. ScheduledWorkout rows with future date AND completion status");
  const futureDoneWorkoutCount = await prisma.scheduledWorkout.count({
    where: {
      scheduledDate: { gte: TOMORROW_START },
      status: { in: ["DONE", "MISSED", "AUTO_SKIPPED"] },
    },
  });
  console.log(`Total (DONE | MISSED | AUTO_SKIPPED on future dates): ${futureDoneWorkoutCount}`);
  // Spec mentions COMPLETED — this enum doesn't have it; the actual values are DONE / MISSED /
  // AUTO_SKIPPED (and SKIPPED for past skips). Future-dated SKIPPED is also nonsensical.
  const futureSkippedCount = await prisma.scheduledWorkout.count({
    where: { scheduledDate: { gte: TOMORROW_START }, status: "SKIPPED" },
  });
  console.log(`Total (SKIPPED on future dates): ${futureSkippedCount}`);

  if (futureDoneWorkoutCount + futureSkippedCount > 0) {
    const sample = await prisma.scheduledWorkout.findMany({
      where: {
        scheduledDate: { gte: TOMORROW_START },
        status: { in: ["DONE", "SKIPPED", "MISSED", "AUTO_SKIPPED"] },
      },
      orderBy: { scheduledDate: "asc" },
      take: 10,
      select: {
        id: true, userId: true, scheduledDate: true, scheduledTime: true,
        status: true, workoutTypeId: true, workoutTypeName: true,
        completedAt: true, workoutLogId: true, pointsEarned: true,
      },
    });
    console.log("\nSample (up to 10):");
    for (const r of sample) {
      console.log(
        `  ${r.id} user=${r.userId.slice(0, 8)} ` +
        `date=${r.scheduledDate.toISOString().split("T")[0]} time=${r.scheduledTime ?? "—"} ` +
        `name=${r.workoutTypeName ?? "?"} status=${r.status} ` +
        `completedAt=${r.completedAt?.toISOString() ?? "null"} ` +
        `logId=${r.workoutLogId ?? "null"} pts=${r.pointsEarned}`,
      );
    }
  }
  console.log("");

  // ── 3. Per-week count of ScheduledWorkouts (PLANNED) for the next 12 weeks ─
  header("3. Per-week PLANNED ScheduledWorkout count for next 12 weeks");
  // Group by user; users with WeeklyTargets are the ones we care about.
  const usersWithTargets = await prisma.user.findMany({
    where: { weeklyTargets: { some: { active: true } } },
    select: {
      id: true, email: true, timezone: true,
      weeklyTargets: { where: { active: true }, select: { workoutTypeName: true, targetCount: true } },
    },
  });

  if (usersWithTargets.length === 0) {
    console.log("No users with active WeeklyTargets.");
  }

  for (const user of usersWithTargets) {
    const expected = user.weeklyTargets.reduce((s, t) => s + t.targetCount, 0);
    const breakdown = user.weeklyTargets
      .map((t) => `${t.workoutTypeName ?? "?"}×${t.targetCount}`).join(", ");
    console.log(
      `\nUser ${user.id} (${user.email}) tz=${user.timezone} expected=${expected}/wk (${breakdown})`,
    );

    for (let w = 0; w < 12; w++) {
      const ws = startOfWeek(addWeeks(new Date(), w), { weekStartsOn: 1 });
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const wsMid = new Date(ws); wsMid.setUTCHours(0, 0, 0, 0);
      const weMid = new Date(we); weMid.setUTCHours(23, 59, 59, 999);
      const count = await prisma.scheduledWorkout.count({
        where: {
          userId: user.id,
          scheduledDate: { gte: wsMid, lte: weMid },
          status: "PLANNED",
        },
      });
      const flag = count < expected ? "  ← UNDER" : count === expected ? "" : "  (over)";
      console.log(
        `  Week ${String(w).padStart(2, "0")} ${format(ws, "MMM dd")}–${format(we, "MMM dd")}: ${count} planned${flag}`,
      );
    }
  }
  console.log("");

  // ── 4. Goals + WeeklyTargets for all users with any active goal ───────────
  header("4. Active Goals and WeeklyTargets");
  const goals = await prisma.goal.findMany({
    where: { status: "active" },
    select: { id: true, userId: true, title: true, deadline: true },
  });
  const allTargets = await prisma.weeklyTarget.findMany({
    select: { id: true, userId: true, goalId: true, workoutTypeName: true, targetCount: true, active: true },
  });
  if (goals.length === 0) {
    console.log("No active goals.");
  } else {
    for (const g of goals) {
      const linked = allTargets.filter((t) => t.goalId === g.id);
      const targets = linked
        .map((t) => `${t.workoutTypeName ?? "?"}×${t.targetCount}${t.active ? "" : " [inactive]"}`)
        .join(", ") || "(none)";
      const dl = g.deadline ? g.deadline.toISOString().split("T")[0] : "no deadline";
      console.log(`  user=${g.userId.slice(0, 8)} goal="${g.title ?? "?"}" deadline=${dl}  targets: ${targets}`);
    }
  }
  console.log(`\nTotal WeeklyTarget rows in DB: ${allTargets.length} (active: ${allTargets.filter((t) => t.active).length})`);
  console.log("");

  // ── 5. Active PlannerConstraints (added in earlier work) ──────────────────
  header("5. Active PlannerConstraints");
  const constraints = await prisma.plannerConstraint.findMany({
    where: { active: true },
    orderBy: { startDate: "asc" },
    select: {
      id: true, userId: true, type: true, scope: true,
      startDate: true, endDate: true, reason: true, source: true,
    },
  });
  console.log(`Total: ${constraints.length}`);
  for (const c of constraints) {
    const range = c.endDate
      ? `${c.startDate.toISOString().split("T")[0]}→${c.endDate.toISOString().split("T")[0]}`
      : `${c.startDate.toISOString().split("T")[0]}→ongoing`;
    console.log(`  ${c.id.slice(0, 8)} user=${c.userId.slice(0, 8)} ${c.type}/${c.scope} ${range}  ${c.reason}  src=${c.source}`);
  }
  console.log("");

  bar();
  console.log("Audit complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(2); })
  .finally(async () => { await prisma.$disconnect(); });
