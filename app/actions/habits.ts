"use server";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const XP_HABIT = 10;
const XP_ALL_BONUS = 25;

export async function completeHabit(habitId: string, date?: string) {
  const session = await requireSession();
  const userId = session.userId;

  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) throw new Error("Habit not found");

  const dateObj = date ? new Date(date) : new Date(new Date().toISOString().split("T")[0]);

  await prisma.habitCompletion.upsert({
    where: { habitId_date: { habitId, date: dateObj } },
    create: { habitId, userId, date: dateObj, points: habit.pointsOnComplete },
    update: {},
  });

  // XP
  await prisma.user.update({ where: { id: userId }, data: { totalXp: { increment: habit.pointsOnComplete } } });

  // All-habits bonus
  const activeHabits = await prisma.habit.count({ where: { userId, active: true } });
  const doneToday = await prisma.habitCompletion.count({ where: { userId, date: dateObj } });
  if (doneToday >= activeHabits && activeHabits > 0) {
    await prisma.user.update({ where: { id: userId }, data: { totalXp: { increment: XP_ALL_BONUS } } });
  }

  revalidatePath("/today");
  return { ok: true, points: XP_HABIT };
}

export async function uncompleteHabit(habitId: string, date?: string) {
  const session = await requireSession();
  const userId = session.userId;
  const dateObj = date ? new Date(date) : new Date(new Date().toISOString().split("T")[0]);
  await prisma.habitCompletion.deleteMany({ where: { habitId, userId, date: dateObj } });
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
