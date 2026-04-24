import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const XP_HABIT = 10;
const XP_ALL_HABITS_BONUS = 25;

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.userId;
  const { habitId } = await req.json();
  if (!habitId) return NextResponse.json({ error: "habitId required" }, { status: 400 });

  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

  const date = todayDate();

  const { completion, totalXp, bonus } = await prisma.$transaction(async (tx) => {
    const completion = await (tx.habitCompletion as any).upsert({
      where: { habitId_date: { habitId, date } },
      create: { habitId, userId, date, points: habit.pointsOnComplete, status: "DONE", source: "MANUAL", completedAt: new Date() },
      update: {},
    });

    const updated = await tx.user.update({
      where: { id: userId },
      data: { totalXp: { increment: habit.pointsOnComplete } },
      select: { totalXp: true },
    });

    const activeHabits = await tx.habit.count({ where: { userId, active: true } });
    const doneToday = await tx.habitCompletion.count({ where: { userId, date } });
    let bonus = 0;
    if (doneToday === activeHabits && activeHabits > 0) {
      bonus = XP_ALL_HABITS_BONUS;
      await tx.user.update({ where: { id: userId }, data: { totalXp: { increment: bonus } } });
    }

    return { completion, totalXp: updated.totalXp, bonus };
  });

  return NextResponse.json({ ok: true, completionId: completion.id, pointsEarned: habit.pointsOnComplete + bonus, totalXp });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  const userId = session.userId;
  const { habitId } = await req.json();
  if (!habitId) return NextResponse.json({ error: "habitId required" }, { status: 400 });

  const date = todayDate();
  await prisma.habitCompletion.deleteMany({ where: { habitId, userId, date } });
  return NextResponse.json({ ok: true });
}
