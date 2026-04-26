import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userTodayStr } from "@/lib/time/today";

const XP_ALL_HABITS_BONUS = 25;

async function userTodayDate(userId: string): Promise<Date> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  const tz = u?.timezone ?? "UTC";
  return new Date(userTodayStr(tz) + "T00:00:00.000Z");
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.userId;
  const { habitId } = await req.json();
  if (!habitId) return NextResponse.json({ error: "habitId required" }, { status: 400 });

  const [habit, date] = await Promise.all([
    prisma.habit.findFirst({ where: { id: habitId, userId } }),
    userTodayDate(userId),
  ]);
  if (!habit) return NextResponse.json({ error: "Habit not found" }, { status: 404 });

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

  const date = await userTodayDate(userId);
  await prisma.habitCompletion.deleteMany({ where: { habitId, userId, date } });
  return NextResponse.json({ ok: true });
}
