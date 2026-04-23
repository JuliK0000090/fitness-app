"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { completeHabit as _completeHabit, uncompleteHabit as _uncompleteHabit } from "@/lib/habits/complete";

export async function completeHabit(habitId: string, date?: string) {
  const session = await requireSession();
  const userId = session.userId;
  const dateObj = date ? new Date(date) : new Date(new Date().toISOString().split("T")[0]);
  const result = await _completeHabit(userId, habitId, dateObj, "MANUAL");
  revalidatePath("/today");
  return result;
}

export async function uncompleteHabit(habitId: string, date?: string) {
  const session = await requireSession();
  const userId = session.userId;
  const dateObj = date ? new Date(date) : new Date(new Date().toISOString().split("T")[0]);
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

export async function completeWorkout(scheduledWorkoutId: string, durationMin?: number) {
  const session = await requireSession();
  const userId = session.userId;

  const sw = await prisma.scheduledWorkout.findFirst({ where: { id: scheduledWorkoutId, userId } });
  if (!sw) throw new Error("Scheduled workout not found");

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
