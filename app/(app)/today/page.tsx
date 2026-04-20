import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodayView } from "./TodayView";

export default async function TodayPage() {
  const session = await requireSession();
  const userId = session.userId;
  const today = new Date().toISOString().split("T")[0];

  const [user, checklist, streaks, recentWorkouts, notifications] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, goalWeightKg: true },
    }),
    prisma.checklistItem.findMany({
      where: { userId, date: today },
      orderBy: { createdAt: "asc" },
    }),
    prisma.streak.findMany({ where: { userId } }),
    prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 3,
    }),
    prisma.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // XP calculation
  const workoutCount = await prisma.workoutLog.count({ where: { userId } });
  const measurementCount = await prisma.measurement.count({ where: { userId } });
  const goalAchievedCount = await prisma.goal.count({ where: { userId, status: "achieved" } });
  const xp = workoutCount * 25 + measurementCount * 10 + goalAchievedCount * 150;
  const level = Math.floor(xp / 500) + 1;
  const xpToNext = 500 - (xp % 500);

  return (
    <TodayView
      userName={user.name ?? "there"}
      checklist={checklist.map((c) => ({ id: c.id, description: c.description, doneAt: c.doneAt?.toISOString() ?? null }))}
      streaks={streaks.map((s) => ({ type: s.type, current: s.current, longest: s.longest }))}
      recentWorkouts={recentWorkouts.map((w) => ({ id: w.id, name: w.workoutName, durationMin: w.durationMin, startedAt: w.startedAt.toISOString() }))}
      notifications={notifications.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, createdAt: n.createdAt.toISOString() }))}
      xp={xp}
      level={level}
      xpToNext={xpToNext}
    />
  );
}
