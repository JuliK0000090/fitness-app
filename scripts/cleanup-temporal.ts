/**
 * Atomic cleanup of every temporal-rule violation found by
 * scripts/audit-temporal-integrity.ts.
 *
 * Per-user "today" is computed from User.timezone (NOT server UTC) so
 * EDT-evening / late-luteal-Asia / etc. edge cases are handled correctly.
 *
 * Six classes of fix, all wrapped in one transaction:
 *
 *   1. ScheduledWorkout: future date AND status in DONE/SKIPPED/MISSED/AUTO_SKIPPED
 *      → reset to PLANNED, clear completedAt + workoutLogId + pointsEarned
 *
 *   2. ScheduledWorkout: past date AND status PLANNED
 *      → set status MISSED (the rollover SHOULD have done this; back-fill)
 *
 *   3. ScheduledWorkout: completedAt < scheduledDate OR completedAt > now
 *      → set completedAt = null (it's wrong; we don't fabricate a real timestamp)
 *
 *   4. WorkoutLog: startedAt > user-local-today (or > now)
 *      → DELETE the row entirely. A WorkoutLog represents an actually-completed
 *        session; if it claims a future moment it never happened. Refunds the
 *        XP that was awarded when it was created.
 *
 *   5. HabitCompletion: date > user-local-today
 *      → DELETE.
 *
 *   6. HabitCompletion: completedAt < date OR completedAt > now
 *      → set completedAt = null.
 *
 * Usage:
 *   npx tsx scripts/cleanup-temporal.ts --dry-run    # report only, no writes
 *   npx tsx scripts/cleanup-temporal.ts              # actually mutate
 *
 * Hit production via:
 *   DATABASE_URL=$(railway variables --service Postgres --json | jq -r .DATABASE_PUBLIC_URL) \
 *     npx tsx scripts/cleanup-temporal.ts --dry-run
 */

import { Prisma, WorkoutStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

const DRY = process.argv.includes("--dry-run");

const NOW = new Date();
const FUTURE_COMPLETION_STATUSES: WorkoutStatus[] = ["DONE", "SKIPPED", "MISSED", "AUTO_SKIPPED"];

function bar() { console.log("─".repeat(72)); }

function userTodayStr(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "UTC" }).format(NOW);
}

function userTomorrowMidnightUTC(timezone: string): Date {
  // The smallest UTC instant that's strictly "after the user's today".
  // We use this as the threshold for "future" — anything stored with date
  // strictly past midnight of user-local tomorrow is too far ahead.
  const todayStr = userTodayStr(timezone);
  const tomorrowStr = (() => {
    const d = new Date(`${todayStr}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split("T")[0];
  })();
  return new Date(`${tomorrowStr}T00:00:00.000Z`);
}

function dateOnlyISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

async function main() {
  bar();
  console.log(`Temporal cleanup — ${DRY ? "DRY RUN" : "LIVE"}`);
  console.log(`Server NOW (UTC): ${NOW.toISOString()}`);
  bar();

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, timezone: true },
  });

  // Per-user thresholds + diagnostics
  const userInfo = new Map<string, { today: string; tomorrowMidnight: Date }>();
  for (const u of users) {
    const tz = u.timezone || "UTC";
    userInfo.set(u.id, {
      today: userTodayStr(tz),
      tomorrowMidnight: userTomorrowMidnightUTC(tz),
    });
  }

  // ── Plan the changes (per user, since "future" depends on tz) ────────────
  type SwReset = { id: string; reason: string };
  type SwMissed = { id: string; reason: string };
  type SwBadCAt = { id: string; oldCAt: string; reason: string };
  type LogDelete = { id: string; userId: string; xp: number; reason: string };
  type HcDelete = { id: string; reason: string };
  type HcBadCAt = { id: string; reason: string };

  const swResets: SwReset[] = [];
  const swMisseds: SwMissed[] = [];
  const swBadCAts: SwBadCAt[] = [];
  const logDeletes: LogDelete[] = [];
  const hcDeletes: HcDelete[] = [];
  const hcBadCAts: HcBadCAt[] = [];
  let xpToRefund = new Map<string, number>(); // userId → total XP to deduct

  // ── ScheduledWorkout ──
  const allSW = await prisma.scheduledWorkout.findMany({
    select: {
      id: true, userId: true, status: true, scheduledDate: true,
      completedAt: true, workoutTypeName: true,
    },
  });
  for (const sw of allSW) {
    const info = userInfo.get(sw.userId);
    if (!info) continue;
    const swDateStr = dateOnlyISO(sw.scheduledDate);

    // Rule 1: future + completion status → reset
    if (swDateStr > info.today && (FUTURE_COMPLETION_STATUSES as string[]).includes(sw.status)) {
      swResets.push({ id: sw.id, reason: `future ${sw.scheduledDate.toISOString().split("T")[0]} + status=${sw.status}` });
      continue;
    }
    // Rule 2: past + PLANNED → MISSED
    if (swDateStr < info.today && sw.status === "PLANNED") {
      swMisseds.push({ id: sw.id, reason: `past ${swDateStr} + status=PLANNED` });
    }
    // Rule 3: completedAt before scheduledDate or in future
    if (sw.completedAt) {
      const cAtIso = sw.completedAt.toISOString().split("T")[0];
      if (cAtIso < swDateStr || sw.completedAt > NOW) {
        swBadCAts.push({
          id: sw.id, oldCAt: sw.completedAt.toISOString(),
          reason: cAtIso < swDateStr ? "completedAt < date" : "completedAt > now",
        });
      }
    }
  }

  // ── WorkoutLog ──
  const allLogs = await prisma.workoutLog.findMany({
    select: { id: true, userId: true, startedAt: true, workoutName: true, xpAwarded: true, source: true },
  });
  for (const log of allLogs) {
    const info = userInfo.get(log.userId);
    if (!info) continue;
    const logDateStr = dateOnlyISO(log.startedAt);
    if (logDateStr > info.today || log.startedAt > NOW) {
      logDeletes.push({
        id: log.id, userId: log.userId, xp: log.xpAwarded ?? 0,
        reason: `"${log.workoutName}" startedAt=${log.startedAt.toISOString()} (user-today=${info.today}) src=${log.source}`,
      });
      xpToRefund.set(log.userId, (xpToRefund.get(log.userId) ?? 0) + (log.xpAwarded ?? 0));
    }
  }

  // ── HabitCompletion ──
  const allHc = await prisma.habitCompletion.findMany({
    select: { id: true, userId: true, date: true, completedAt: true, status: true },
  });
  for (const hc of allHc) {
    const info = userInfo.get(hc.userId);
    if (!info) continue;
    const hcDateStr = dateOnlyISO(hc.date);
    if (hcDateStr > info.today) {
      hcDeletes.push({ id: hc.id, reason: `future ${hcDateStr} (user-today=${info.today})` });
      continue;
    }
    if (hc.completedAt) {
      const cAtIso = dateOnlyISO(hc.completedAt);
      if (cAtIso < hcDateStr || hc.completedAt > NOW) {
        hcBadCAts.push({
          id: hc.id,
          reason: cAtIso < hcDateStr ? `completedAt(${cAtIso}) < date(${hcDateStr})` : `completedAt > now`,
        });
      }
    }
  }

  // ── Report ──
  console.log(`\nProposed changes:`);
  console.log(`  ScheduledWorkout reset (future-completion → PLANNED):  ${swResets.length}`);
  for (const r of swResets) console.log(`     id=${r.id}  ${r.reason}`);
  console.log(`  ScheduledWorkout past-PLANNED → MISSED:                ${swMisseds.length}`);
  for (const m of swMisseds.slice(0, 20)) console.log(`     id=${m.id}  ${m.reason}`);
  if (swMisseds.length > 20) console.log(`     … and ${swMisseds.length - 20} more`);
  console.log(`  ScheduledWorkout completedAt cleared:                  ${swBadCAts.length}`);
  for (const b of swBadCAts) console.log(`     id=${b.id}  ${b.reason}  oldCAt=${b.oldCAt}`);
  console.log(`  WorkoutLog deleted (startedAt in the future):          ${logDeletes.length}`);
  for (const l of logDeletes) console.log(`     id=${l.id}  user=${l.userId.slice(0, 8)}  xp=${l.xp}  ${l.reason}`);
  console.log(`  HabitCompletion deleted (future date):                 ${hcDeletes.length}`);
  for (const h of hcDeletes) console.log(`     id=${h.id}  ${h.reason}`);
  console.log(`  HabitCompletion completedAt cleared:                   ${hcBadCAts.length}`);
  for (const h of hcBadCAts) console.log(`     id=${h.id}  ${h.reason}`);
  console.log(`  XP to refund (per user):`);
  for (const [u, x] of xpToRefund) console.log(`     u=${u.slice(0, 8)}  -${x}`);

  const totalChanges =
    swResets.length + swMisseds.length + swBadCAts.length +
    logDeletes.length + hcDeletes.length + hcBadCAts.length;

  if (totalChanges === 0) {
    console.log("\nNothing to clean up. ✓");
    return;
  }

  if (DRY) {
    console.log("\n[DRY RUN] no changes written. Re-run without --dry-run to apply.");
    return;
  }

  // ── Apply atomically ──
  console.log("\nApplying in a single transaction…");
  await prisma.$transaction(async (tx) => {
    if (swResets.length > 0) {
      await tx.scheduledWorkout.updateMany({
        where: { id: { in: swResets.map((r) => r.id) } },
        data: {
          status: "PLANNED",
          completedAt: null,
          workoutLogId: null,
          pointsEarned: 0,
        },
      });
    }
    if (swMisseds.length > 0) {
      await tx.scheduledWorkout.updateMany({
        where: { id: { in: swMisseds.map((r) => r.id) } },
        data: { status: "MISSED" },
      });
    }
    if (swBadCAts.length > 0) {
      await tx.scheduledWorkout.updateMany({
        where: { id: { in: swBadCAts.map((r) => r.id) } },
        data: { completedAt: null },
      });
    }
    if (logDeletes.length > 0) {
      await tx.workoutLog.deleteMany({ where: { id: { in: logDeletes.map((r) => r.id) } } });
    }
    if (hcDeletes.length > 0) {
      await tx.habitCompletion.deleteMany({ where: { id: { in: hcDeletes.map((r) => r.id) } } });
    }
    if (hcBadCAts.length > 0) {
      await tx.habitCompletion.updateMany({
        where: { id: { in: hcBadCAts.map((r) => r.id) } },
        data: { completedAt: null },
      });
    }
    for (const [userId, xp] of xpToRefund) {
      if (xp <= 0) continue;
      await tx.user.update({
        where: { id: userId },
        data: { totalXp: { decrement: xp } },
      });
    }
  });

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(2); })
  .finally(async () => { await prisma.$disconnect(); });
