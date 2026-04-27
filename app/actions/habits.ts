"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { completeHabit as _completeHabit, uncompleteHabit as _uncompleteHabit } from "@/lib/habits/complete";
import { userTodayStr } from "@/lib/time/today";

async function getUserTimezone(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return u?.timezone ?? "UTC";
}

export async function completeHabit(habitId: string, date?: string) {
  const session = await requireSession();
  const userId = session.userId;
  let dateObj: Date;
  if (date) {
    dateObj = new Date(date + "T00:00:00.000Z");
  } else {
    const tz = await getUserTimezone(userId);
    dateObj = new Date(userTodayStr(tz) + "T00:00:00.000Z");
  }
  const result = await _completeHabit(userId, habitId, dateObj, "MANUAL");
  revalidatePath("/today");
  return result;
}

export async function uncompleteHabit(habitId: string, date?: string) {
  const session = await requireSession();
  const userId = session.userId;
  let dateObj: Date;
  if (date) {
    dateObj = new Date(date + "T00:00:00.000Z");
  } else {
    const tz = await getUserTimezone(userId);
    dateObj = new Date(userTodayStr(tz) + "T00:00:00.000Z");
  }
  await _uncompleteHabit(userId, habitId, dateObj);
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteHabit(habitId: string) {
  const session = await requireSession();
  await prisma.habit.deleteMany({ where: { id: habitId, userId: session.userId } });
  revalidatePath("/today");
  return { ok: true };
}

export async function skipWorkout(scheduledWorkoutId: string, reason?: string) {
  const session = await requireSession();
  await prisma.scheduledWorkout.update({
    where: { id: scheduledWorkoutId, userId: session.userId },
    data: { status: "SKIPPED", skippedReason: reason ?? null },
  });
  revalidatePath("/today");
  return { ok: true };
}

/**
 * Mark a scheduled workout as DONE.
 *
 * Hard rule: the workout's scheduledDate must be ≤ user-local-today.
 * The UTC-only Postgres CHECK is a safety net; this function uses the
 * user's stored timezone so EDT-evening (UTC-already-tomorrow) edge
 * cases can't slip through.
 *
 * Idempotent: no-op if already DONE.
 */
export async function completeWorkout(scheduledWorkoutId: string, durationMin?: number) {
  const session = await requireSession();
  const userId = session.userId;

  const sw = await prisma.scheduledWorkout.findFirst({ where: { id: scheduledWorkoutId, userId } });
  if (!sw) throw new Error("Scheduled workout not found");

  if (sw.status === "DONE") {
    return { ok: true, alreadyDone: true };
  }

  // User-timezone-aware future-date guard.
  const tz = await getUserTimezone(userId);
  const todayStr = userTodayStr(tz);
  const swDateStr = sw.scheduledDate.toISOString().split("T")[0];
  if (swDateStr > todayStr) {
    throw new Error(
      `FUTURE_WORKOUT_NOT_ALLOWED: cannot mark a workout dated ${swDateStr} as done — ` +
      `your local today is ${todayStr}. If the date is wrong, reschedule the workout first.`,
    );
  }

  const log = await prisma.workoutLog.create({
    data: {
      userId,
      typeId: sw.workoutTypeId ?? null,
      workoutName: sw.workoutTypeName ?? "Workout",
      durationMin: durationMin ?? sw.duration,
      xpAwarded: 50,
    },
  });

  await prisma.scheduledWorkout.update({
    where: { id: scheduledWorkoutId },
    data: { status: "DONE", completedAt: new Date(), workoutLogId: log.id, pointsEarned: 50 },
  });

  await prisma.user.update({ where: { id: userId }, data: { totalXp: { increment: 50 } } });

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/month");
  return { ok: true };
}

/**
 * Undo a workout completion. Reverts status → PLANNED, deletes the
 * WorkoutLog row, refunds the XP, and clears completedAt / workoutLogId.
 *
 * Used by the calendar checkbox toggle so a user can correct an accidental
 * tap. Idempotent: no-op if the workout isn't DONE.
 */
export async function uncompleteWorkout(scheduledWorkoutId: string) {
  const session = await requireSession();
  const userId = session.userId;

  const sw = await prisma.scheduledWorkout.findFirst({ where: { id: scheduledWorkoutId, userId } });
  if (!sw) throw new Error("Scheduled workout not found");
  if (sw.status !== "DONE") {
    return { ok: true, wasNotDone: true };
  }

  await prisma.$transaction(async (tx) => {
    if (sw.workoutLogId) {
      await tx.workoutLog.deleteMany({ where: { id: sw.workoutLogId, userId } });
    }
    await tx.scheduledWorkout.update({
      where: { id: scheduledWorkoutId },
      data: {
        status: "PLANNED",
        completedAt: null,
        workoutLogId: null,
        pointsEarned: 0,
      },
    });
    if (sw.pointsEarned > 0) {
      await tx.user.update({
        where: { id: userId },
        data: { totalXp: { decrement: sw.pointsEarned } },
      });
    }
  });

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/month");
  return { ok: true };
}
