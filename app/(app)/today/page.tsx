import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodayView } from "./TodayView";
import { format } from "date-fns";

function computeLevel(totalXp: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 50)));
  const currentFloor = 50 * level * (level + 1);
  const nextFloor = 50 * (level + 1) * (level + 2);
  return { level, totalXp, xpToNext: nextFloor - totalXp, xpInLevel: totalXp - currentFloor };
}

function isHabitDueToday(cadence: string, specificDays: number[]): boolean {
  const dow = new Date().getDay();
  switch (cadence.toLowerCase()) {
    case "daily": return true;
    case "weekdays": return dow >= 1 && dow <= 5;
    case "weekends": return dow === 0 || dow === 6;
    case "specific_days": return specificDays.includes(dow);
    default: return true;
  }
}

export default async function TodayPage() {
  const session = await requireSession();
  const userId = session.userId;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayDate = new Date(todayStr);

  // Monday of this week
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [user, habits, completions, scheduledWorkouts, weeklyTargets, notifications, weeklyDone, hasGoals] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, totalXp: true, currentStreak: true, bestStreak: true },
    }),
    prisma.habit.findMany({ where: { userId, active: true }, orderBy: { createdAt: "asc" } }),
    prisma.habitCompletion.findMany({ where: { userId, date: todayDate }, select: { habitId: true } }),
    prisma.scheduledWorkout.findMany({
      where: { userId, scheduledDate: todayDate, status: { in: ["PLANNED", "MOVED"] } },
      orderBy: { scheduledTime: "asc" },
    }),
    prisma.weeklyTarget.findMany({
      where: { userId, active: true },
      include: { workoutType: { select: { name: true, icon: true } } },
    }),
    prisma.notification.findMany({ where: { userId, readAt: null }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.scheduledWorkout.findMany({
      where: { userId, scheduledDate: { gte: monday, lte: sunday }, status: "DONE" },
      select: { workoutTypeName: true },
    }),
    prisma.goal.count({ where: { userId, status: "active" } }).then((c) => c > 0),
  ]);

  const doneCounts: Record<string, number> = {};
  for (const w of weeklyDone) {
    const key = w.workoutTypeName ?? "Unknown";
    doneCounts[key] = (doneCounts[key] ?? 0) + 1;
  }

  const { level, totalXp, xpToNext, xpInLevel } = computeLevel(user.totalXp);
  const xpPct = Math.min(100, (xpInLevel / Math.max(1, xpInLevel + xpToNext)) * 100);

  const completedIds = new Set(completions.map((c) => c.habitId));
  const dueHabits = habits.filter((h) => isHabitDueToday(h.cadence, h.specificDays));

  return (
    <TodayView
      userName={user.name ?? "there"}
      dateLabel={format(new Date(), "EEEE, MMMM d")}
      level={level}
      totalXp={totalXp}
      xpToNext={xpToNext}
      xpPct={xpPct}
      currentStreak={user.currentStreak}
      habits={dueHabits.map((h) => ({
        id: h.id,
        title: h.title,
        icon: h.icon ?? "CheckCircle",
        duration: h.duration,
        pointsOnComplete: h.pointsOnComplete,
        done: completedIds.has(h.id),
      }))}
      scheduledWorkouts={scheduledWorkouts.map((sw) => ({
        id: sw.id,
        name: sw.workoutTypeName ?? "Workout",
        scheduledTime: sw.scheduledTime,
        duration: sw.duration,
        status: sw.status,
      }))}
      weeklyTargets={weeklyTargets.map((wt) => ({
        id: wt.id,
        label: wt.workoutTypeName ?? wt.workoutType?.name ?? "Workout",
        icon: wt.workoutType?.icon ?? "Dumbbell",
        target: wt.targetCount,
        done: doneCounts[wt.workoutTypeName ?? ""] ?? 0,
      }))}
      notifications={notifications.map((n) => ({ id: n.id, title: n.title, body: n.body }))}
      hasGoals={hasGoals}
    />
  );
}
