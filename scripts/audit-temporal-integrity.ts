/**
 * Read-only audit of temporal integrity across every model that the calendar
 * renders. Computes "today" per-user using their stored timezone (NOT server
 * UTC) so EDT-evening / BST edge cases are accurate.
 *
 * Calibrated to actual schema:
 *   - WorkoutStatus: PLANNED | DONE | SKIPPED | MOVED | MISSED | AUTO_SKIPPED
 *     (no COMPLETED, no SUGGESTED, no IN_PROGRESS — those are spec-only names)
 *   - CompletionStatus: DONE | MISSED | SKIPPED | PENDING
 *
 * Date fields:
 *   - ScheduledWorkout.scheduledDate (@db.Date, UTC midnight)
 *   - ScheduledWorkout.completedAt (DateTime?)
 *   - WorkoutLog.startedAt (DateTime, with time-of-day)
 *   - HabitCompletion.date (@db.Date)
 *   - HabitCompletion.completedAt (DateTime?)
 *
 * No TimelineBlock model exists in this repo.
 */

import { prisma } from "../lib/prisma";

const COMPLETION_LIKE_WORKOUT_STATUSES = ["DONE", "SKIPPED", "MISSED", "AUTO_SKIPPED"] as const;
const COMPLETION_LIKE_HABIT_STATUSES = ["DONE", "SKIPPED", "MISSED"] as const;

function bar() { console.log("─".repeat(72)); }
function head(s: string) { bar(); console.log(s); bar(); }

function userTodayStr(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "UTC" }).format(new Date());
}

function dateOnlyISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

async function main() {
  const startedAt = new Date();
  console.log("Audit started", startedAt.toISOString());

  // Per-user "today" computed from their stored timezone.
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, timezone: true },
  });
  const userToday = new Map<string, string>();
  for (const u of users) userToday.set(u.id, userTodayStr(u.timezone || "UTC"));
  console.log(`Users: ${users.length}`);
  for (const u of users) console.log(`  ${u.id.slice(0, 12)} ${u.email}  tz=${u.timezone || "UTC"}  today=${userToday.get(u.id)}`);

  // ── ScheduledWorkout audit ───────────────────────────────────────────────
  head("\n[A] ScheduledWorkout temporal violations");
  const allSW = await prisma.scheduledWorkout.findMany({
    select: {
      id: true, userId: true, workoutTypeName: true, status: true,
      scheduledDate: true, completedAt: true, source: true, userEdited: true,
    },
  });
  console.log(`Scanning ${allSW.length} ScheduledWorkout rows`);

  type SwViolation = { id: string; userId: string; date: string; status: string; rule: string; name: string | null };
  const swViolations: SwViolation[] = [];

  for (const sw of allSW) {
    const today = userToday.get(sw.userId);
    if (!today) continue;
    const swDate = dateOnlyISO(sw.scheduledDate);
    const isFuture = swDate > today;
    const isPast = swDate < today;

    // R3: future cannot be DONE/SKIPPED/MISSED/AUTO_SKIPPED
    if (isFuture && (COMPLETION_LIKE_WORKOUT_STATUSES as readonly string[]).includes(sw.status)) {
      swViolations.push({ id: sw.id, userId: sw.userId, date: swDate, status: sw.status, rule: "future-completed", name: sw.workoutTypeName });
    }
    // R1: past cannot be PLANNED (rollover should have made it MISSED)
    if (isPast && sw.status === "PLANNED") {
      swViolations.push({ id: sw.id, userId: sw.userId, date: swDate, status: sw.status, rule: "past-planned", name: sw.workoutTypeName });
    }
    // R4: completedAt cannot be before scheduledDate, and cannot be > now
    if (sw.completedAt) {
      const cAtIso = sw.completedAt.toISOString().split("T")[0];
      if (cAtIso < swDate) {
        swViolations.push({ id: sw.id, userId: sw.userId, date: swDate, status: sw.status, rule: `completedAt-before-date (cAt=${cAtIso})`, name: sw.workoutTypeName });
      }
      if (sw.completedAt > startedAt) {
        swViolations.push({ id: sw.id, userId: sw.userId, date: swDate, status: sw.status, rule: `completedAt-in-future (cAt=${sw.completedAt.toISOString()})`, name: sw.workoutTypeName });
      }
    }
  }

  const swByRule = new Map<string, SwViolation[]>();
  for (const v of swViolations) {
    const list = swByRule.get(v.rule) || [];
    list.push(v);
    swByRule.set(v.rule, list);
  }
  console.log(`Total ScheduledWorkout violations: ${swViolations.length}`);
  for (const [rule, list] of swByRule) {
    console.log(`  ${rule}: ${list.length}`);
    for (const v of list.slice(0, 10)) {
      console.log(`     ${v.date} u=${v.userId.slice(0, 8)} ${v.name ?? "?"} status=${v.status} id=${v.id}`);
    }
    if (list.length > 10) console.log(`     … and ${list.length - 10} more`);
  }

  // ── WorkoutLog audit ─────────────────────────────────────────────────────
  // WorkoutLog is the SECOND source the /month drawer renders as DONE
  // (lib/(app)/month/page.tsx merges them in). It has no status field — every
  // row is implicitly "I did this". A future startedAt is impossible-by-meaning.
  head("\n[B] WorkoutLog temporal violations");
  const allLogs = await prisma.workoutLog.findMany({
    select: { id: true, userId: true, workoutName: true, startedAt: true, source: true, typeId: true },
  });
  console.log(`Scanning ${allLogs.length} WorkoutLog rows`);

  type LogViolation = { id: string; userId: string; date: string; name: string; source: string; rule: string };
  const logViolations: LogViolation[] = [];

  for (const log of allLogs) {
    const today = userToday.get(log.userId);
    if (!today) continue;
    const logDate = dateOnlyISO(log.startedAt);

    if (logDate > today) {
      logViolations.push({
        id: log.id, userId: log.userId, date: logDate, name: log.workoutName,
        source: log.source, rule: "log-startedAt-future",
      });
    }
    if (log.startedAt > startedAt) {
      logViolations.push({
        id: log.id, userId: log.userId, date: logDate, name: log.workoutName,
        source: log.source, rule: `log-startedAt-after-now (${log.startedAt.toISOString()})`,
      });
    }
  }

  console.log(`Total WorkoutLog violations: ${logViolations.length}`);
  const logByRule = new Map<string, LogViolation[]>();
  for (const v of logViolations) {
    const list = logByRule.get(v.rule) || [];
    list.push(v);
    logByRule.set(v.rule, list);
  }
  for (const [rule, list] of logByRule) {
    console.log(`  ${rule}: ${list.length}`);
    for (const v of list.slice(0, 10)) {
      console.log(`     ${v.date} u=${v.userId.slice(0, 8)} "${v.name}" src=${v.source} id=${v.id}`);
    }
    if (list.length > 10) console.log(`     … and ${list.length - 10} more`);
  }

  // ── HabitCompletion audit ────────────────────────────────────────────────
  head("\n[C] HabitCompletion temporal violations");
  const allHc = await prisma.habitCompletion.findMany({
    select: { id: true, userId: true, habitId: true, date: true, status: true, source: true, completedAt: true },
  });
  console.log(`Scanning ${allHc.length} HabitCompletion rows`);

  type HcViolation = { id: string; userId: string; date: string; status: string; rule: string };
  const hcViolations: HcViolation[] = [];

  for (const hc of allHc) {
    const today = userToday.get(hc.userId);
    if (!today) continue;
    const hcDate = dateOnlyISO(hc.date);
    const isFuture = hcDate > today;

    if (isFuture) {
      hcViolations.push({ id: hc.id, userId: hc.userId, date: hcDate, status: hc.status, rule: "future-habit-completion" });
    }
    if (hc.completedAt && dateOnlyISO(hc.completedAt) < hcDate) {
      hcViolations.push({ id: hc.id, userId: hc.userId, date: hcDate, status: hc.status, rule: `completedAt-before-date (cAt=${dateOnlyISO(hc.completedAt)})` });
    }
    if (hc.completedAt && hc.completedAt > startedAt) {
      hcViolations.push({ id: hc.id, userId: hc.userId, date: hcDate, status: hc.status, rule: `completedAt-in-future (${hc.completedAt.toISOString()})` });
    }
  }
  console.log(`Total HabitCompletion violations: ${hcViolations.length}`);
  const hcByRule = new Map<string, HcViolation[]>();
  for (const v of hcViolations) {
    const list = hcByRule.get(v.rule) || [];
    list.push(v);
    hcByRule.set(v.rule, list);
  }
  for (const [rule, list] of hcByRule) {
    console.log(`  ${rule}: ${list.length}`);
    for (const v of list.slice(0, 10)) {
      console.log(`     ${v.date} u=${v.userId.slice(0, 8)} status=${v.status} id=${v.id}`);
    }
  }

  // ── Cross-check on June 21 (the screenshot date) ─────────────────────────
  head("\n[D] Cross-check: every row that the /month page would render on 2026-06-21");
  console.log("This is the same query path as app/(app)/month/page.tsx for the highlighted day.");
  for (const u of users) {
    const sw = await prisma.scheduledWorkout.findMany({
      where: { userId: u.id, scheduledDate: new Date("2026-06-21T00:00:00.000Z") },
      select: { id: true, workoutTypeName: true, status: true, source: true, userEdited: true },
    });
    const logs = await prisma.workoutLog.findMany({
      where: {
        userId: u.id,
        startedAt: {
          gte: new Date("2026-06-21T00:00:00.000Z"),
          lte: new Date("2026-06-21T23:59:59.999Z"),
        },
      },
      select: { id: true, workoutName: true, source: true, startedAt: true },
    });
    const hc = await prisma.habitCompletion.findMany({
      where: { userId: u.id, date: new Date("2026-06-21T00:00:00.000Z") },
      select: { id: true, status: true, source: true, completedAt: true },
    });

    if (sw.length === 0 && logs.length === 0 && hc.length === 0) continue;
    console.log(`\n  user=${u.email} (today=${userToday.get(u.id)})`);
    if (sw.length > 0) {
      console.log(`    ScheduledWorkout (${sw.length}):`);
      for (const r of sw) console.log(`      ${r.workoutTypeName} status=${r.status} src=${r.source} edited=${r.userEdited} id=${r.id}`);
    }
    if (logs.length > 0) {
      console.log(`    WorkoutLog (${logs.length}) — these render as DONE in the drawer:`);
      for (const r of logs) console.log(`      "${r.workoutName}" startedAt=${r.startedAt.toISOString()} src=${r.source} id=${r.id}`);
    }
    if (hc.length > 0) {
      console.log(`    HabitCompletion (${hc.length}):`);
      for (const r of hc) console.log(`      status=${r.status} src=${r.source} cAt=${r.completedAt?.toISOString() ?? "null"} id=${r.id}`);
    }
  }

  // ── DB-level CHECK constraint snapshot ───────────────────────────────────
  head("\n[E] CHECK constraints currently installed");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const constraints = await prisma.$queryRawUnsafe<any[]>(
    `SELECT conname, pg_get_constraintdef(oid) AS def
     FROM pg_constraint
     WHERE contype = 'c'
       AND conname IN (
         'habit_completion_date_not_future',
         'scheduled_workout_done_only_past_or_today',
         'scheduled_workout_completedAt_after_date',
         'scheduled_workout_no_future_completion',
         'workout_log_no_future_startedAt',
         'habit_completion_completedAt_after_date'
       )`,
  );
  if (constraints.length === 0) {
    console.log("  NONE of the temporal CHECK constraints we're searching for are present.");
  } else {
    for (const c of constraints) console.log(`  ${c.conname}: ${c.def}`);
  }

  bar();
  console.log("Audit complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(2); })
  .finally(async () => { await prisma.$disconnect(); });
