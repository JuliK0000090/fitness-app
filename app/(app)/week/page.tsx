import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WeekView } from "./WeekView";
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from "date-fns";

export default async function WeekPage() {
  const session = await requireSession();
  const userId = session.userId;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [scheduledWorkouts, completions, habits, weeklyTargets, allHabits] = await Promise.all([
    prisma.scheduledWorkout.findMany({
      where: { userId, scheduledDate: { gte: weekStart, lte: weekEnd } },
      orderBy: { scheduledDate: "asc" },
    }),
    prisma.habitCompletion.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      select: { habitId: true, date: true },
    }),
    prisma.habit.findMany({ where: { userId, active: true }, select: { id: true } }),
    prisma.weeklyTarget.findMany({
      where: { userId, active: true },
      include: { workoutType: { select: { name: true, icon: true } } },
    }),
    prisma.habit.count({ where: { userId, active: true } }),
  ]);

  const doneCounts: Record<string, number> = {};
  for (const sw of scheduledWorkouts.filter((s) => s.status === "DONE")) {
    const key = sw.workoutTypeName ?? "Unknown";
    doneCounts[key] = (doneCounts[key] ?? 0) + 1;
  }

  const dayData = days.map((d) => {
    const dateStr = format(d, "yyyy-MM-dd");
    const dayWorkouts = scheduledWorkouts.filter(
      (w) => format(new Date(w.scheduledDate), "yyyy-MM-dd") === dateStr
    );
    const dayCompletions = completions.filter(
      (c) => format(new Date(c.date), "yyyy-MM-dd") === dateStr
    );
    const pct = allHabits > 0 ? Math.round((dayCompletions.length / allHabits) * 100) : 0;

    return {
      date: dateStr,
      dayLabel: format(d, "EEE"),
      dayNum: format(d, "d"),
      isToday: dateStr === format(now, "yyyy-MM-dd"),
      workouts: dayWorkouts.map((w) => ({
        id: w.id,
        name: w.workoutTypeName ?? "Workout",
        status: w.status,
        duration: w.duration,
      })),
      habitPct: pct,
      xp: dayWorkouts.filter((w) => w.status === "DONE").length * 50 + dayCompletions.length * 10,
    };
  });

  return (
    <WeekView
      weekLabel={`${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`}
      days={dayData}
      weeklyTargets={weeklyTargets.map((wt) => ({
        id: wt.id,
        label: wt.workoutTypeName ?? wt.workoutType?.name ?? "Workout",
        icon: wt.workoutType?.icon ?? "Dumbbell",
        target: wt.targetCount,
        done: doneCounts[wt.workoutTypeName ?? ""] ?? 0,
      }))}
    />
  );
}
