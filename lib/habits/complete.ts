/**
 * Canonical habit completion functions.
 * Single source of truth for writing HabitCompletion rows.
 * All callers (server actions, rollover job, wearable sync) should use these.
 */

import { prisma } from "@/lib/prisma";

/**
 * Catch the Postgres CHECK constraint that bans future-dated HabitCompletion
 * rows (see scripts/migrate.js Phase 2). Logs a clear "data integrity bug"
 * message instead of bubbling up an opaque DB error. Returns true if the
 * write succeeded, false if it was rejected — caller decides what to do.
 */
async function safeCompletionWrite<T>(
  description: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/habit_completion_date_not_future|habit_completion_completedat_after_date|scheduled_workout_done_only_past_or_today|scheduled_workout_completedat_after_date|workout_log_no_future_startedat/i.test(msg)) {
      console.error(
        `[planner-health] CHECK constraint blocked write — ${description}. ` +
        `This is a bug — caller tried to write a temporally invalid row. ` +
        `Investigate the call site. Original error: ${msg.split("\n")[0]}`,
      );
      return null;
    }
    throw e;
  }
}

const XP_HABIT = 10;
const XP_ALL_BONUS = 25;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompletionSource = any; // resolved at runtime; Prisma enum added in this migration

/**
 * Mark a habit as DONE for a given date.
 * Idempotent: if already completed, returns without double-awarding XP.
 */
export async function completeHabit(
  userId: string,
  habitId: string,
  date: Date,
  source: CompletionSource = "MANUAL"
): Promise<{ ok: boolean; xpAwarded: number }> {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) throw new Error("Habit not found");

  const existing = await (prisma.habitCompletion as any).findUnique({
    where: { habitId_date: { habitId, date } },
    select: { id: true, status: true },
  });

  // Already DONE — no-op
  if (existing?.status === "DONE") return { ok: true, xpAwarded: 0 };

  const writeOk = await safeCompletionWrite(
    `completeHabit user=${userId.slice(0, 8)} habit=${habitId.slice(0, 8)} date=${date.toISOString().split("T")[0]}`,
    async () => {
      if (existing) {
        // Exists but not DONE (e.g. SKIPPED by rollover) — upgrade to DONE
        await (prisma.habitCompletion as any).update({
          where: { id: existing.id },
          data: { status: "DONE", source, completedAt: new Date(), points: habit.pointsOnComplete },
        });
      } else {
        await (prisma.habitCompletion as any).create({
          data: {
            habitId,
            userId,
            date,
            status: "DONE",
            source,
            completedAt: new Date(),
            points: habit.pointsOnComplete,
          },
        });
      }
      return true;
    },
  );
  if (!writeOk) return { ok: false, xpAwarded: 0 };

  // XP award
  await prisma.user.update({
    where: { id: userId },
    data: { totalXp: { increment: habit.pointsOnComplete } },
  });

  // All-habits bonus
  const activeCount = await prisma.habit.count({ where: { userId, active: true } });
  const doneToday = await (prisma.habitCompletion as any).count({
    where: { userId, date, status: "DONE" },
  });
  let bonusXp = 0;
  if (activeCount > 0 && doneToday >= activeCount) {
    await prisma.user.update({
      where: { id: userId },
      data: { totalXp: { increment: XP_ALL_BONUS } },
    });
    bonusXp = XP_ALL_BONUS;
  }

  return { ok: true, xpAwarded: habit.pointsOnComplete + bonusXp };
}

/**
 * Remove a DONE completion for a given date (user-initiated undo).
 * Does NOT touch rollover-created MISSED rows — those are handled by the rollover job.
 */
export async function uncompleteHabit(
  userId: string,
  habitId: string,
  date: Date
): Promise<{ ok: boolean }> {
  await (prisma.habitCompletion as any).deleteMany({
    where: { habitId, userId, date, status: "DONE" },
  });
  return { ok: true };
}

/**
 * Mark a habit as SKIPPED for a given date.
 * SKIPPED is user-initiated (e.g. "I'm travelling today").
 * Rollover-created misses use MISSED instead.
 */
export async function skipHabit(
  userId: string,
  habitId: string,
  date: Date,
  note?: string
): Promise<{ ok: boolean }> {
  const existing = await (prisma.habitCompletion as any).findUnique({
    where: { habitId_date: { habitId, date } },
    select: { id: true, status: true },
  });

  if (existing?.status === "DONE") {
    // Cannot skip something already completed — noop
    return { ok: false };
  }

  if (existing) {
    await (prisma.habitCompletion as any).update({
      where: { id: existing.id },
      data: { status: "SKIPPED", note: note ?? null },
    });
  } else {
    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit) throw new Error("Habit not found");

    await (prisma.habitCompletion as any).create({
      data: {
        habitId,
        userId,
        date,
        status: "SKIPPED",
        source: "MANUAL",
        completedAt: null,
        points: 0,
        note: note ?? null,
      },
    });
  }

  return { ok: true };
}

/**
 * Rollover function: mark all habits that have no completion row for `date` as MISSED.
 * Called by the hourly rollover sweep at user-local midnight.
 * Returns count of newly-missed habits.
 */
export async function markMissedHabits(userId: string, date: Date): Promise<number> {
  const activeHabits = await prisma.habit.findMany({
    where: { userId, active: true },
    select: { id: true },
  });

  const existing = await (prisma.habitCompletion as any).findMany({
    where: { userId, date },
    select: { habitId: true },
  });
  const existingIds = new Set((existing as { habitId: string }[]).map((c) => c.habitId));

  const missed = activeHabits.filter((h) => !existingIds.has(h.id));
  if (missed.length === 0) return 0;

  await (prisma.habitCompletion as any).createMany({
    data: missed.map((h) => ({
      habitId: h.id,
      userId,
      date,
      status: "MISSED",
      source: "ROLLOVER_MISS",
      completedAt: null,
      points: 0,
    })),
    skipDuplicates: true,
  });

  return missed.length;
}

export { XP_HABIT, XP_ALL_BONUS };
