import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodayView } from "./TodayView";
import { userTodayStr } from "@/lib/time/today";

function computeLevel(totalXp: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 50)));
  const currentFloor = 50 * level * (level + 1);
  const nextFloor = 50 * (level + 1) * (level + 2);
  return { level, totalXp, xpToNext: nextFloor - totalXp, xpInLevel: totalXp - currentFloor };
}

function isHabitDueToday(cadence: string, specificDays: number[], timezone: string): boolean {
  // Use user's local timezone to determine day-of-week
  const localDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  const dow = new Date(localDateStr + "T12:00:00Z").getUTCDay(); // noon UTC of that local date
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

  // Fetch user first to get timezone before computing today's date
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, totalXp: true, currentStreak: true, timezone: true },
  });

  // Use user's local timezone — fixes the UTC-offset carry-over bug
  const timezone = user.timezone ?? "UTC";
  const todayStr = userTodayStr(timezone);
  const todayDate = new Date(todayStr + "T00:00:00.000Z");

  // Format date label in user's local timezone
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  // Monday of this week in UTC (weekly targets don't need per-user tz)
  const monday = new Date(todayDate);
  monday.setUTCDate(todayDate.getUTCDate() - ((todayDate.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const [habits, completions, scheduledWorkouts, weeklyTargets, notifications, weeklyDone, hasGoals] = await Promise.all([
    prisma.habit.findMany({ where: { userId, active: true }, orderBy: { createdAt: "asc" } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.habitCompletion as any).findMany({ where: { userId, date: todayDate, status: "DONE" }, select: { habitId: true } }),
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

  const completedIds = new Set((completions as { habitId: string }[]).map((c) => c.habitId));
  const dueHabits = habits.filter((h) => isHabitDueToday(h.cadence, h.specificDays, timezone));

  return (
    <TodayView
      userName={user.name ?? "there"}
      dateLabel={dateLabel}
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
