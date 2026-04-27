import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MonthView } from "./MonthView";
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from "date-fns";

// Always render fresh — never serve a cached payload that could show a
// workout in a state it isn't in (the bug that caused phantom DONE rows).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const session = await requireSession();
  const userId = session.userId;
  const { m } = await searchParams;

  const refDate = m ? new Date(`${m}-01`) : new Date();
  const monthStart = startOfMonth(refDate);
  const monthEnd = endOfMonth(refDate);
  const monthLabel = format(refDate, "MMMM yyyy");
  const prevMonth = format(new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1), "yyyy-MM");
  const nextMonth = format(new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1), "yyyy-MM");

  const [scheduledWorkouts, workoutLogs, completions, habits, goals] = await Promise.all([
    prisma.scheduledWorkout.findMany({
      where: { userId, scheduledDate: { gte: monthStart, lte: monthEnd } },
      orderBy: { scheduledDate: "asc" },
    }),
    // WorkoutLogs include screenshot-imported past workouts
    prisma.workoutLog.findMany({
      where: { userId, startedAt: { gte: monthStart, lte: monthEnd } },
      orderBy: { startedAt: "asc" },
    }),
    prisma.habitCompletion.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      select: { date: true, habitId: true, status: true },
    }),
    prisma.habit.count({ where: { userId, active: true } }),
    prisma.goal.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
      select: {
        id: true, title: true, status: true, category: true,
        targetValue: true, startValue: true, currentValue: true, unit: true,
        targetMetric: true, predictedHitDate: true, deadline: true,
      },
    }),
  ]);

  // Build per-day maps — merge ScheduledWorkouts + WorkoutLogs
  const swByDay: Record<string, { id: string; name: string; status: string; duration: number; source: string }[]> = {};
  for (const sw of scheduledWorkouts) {
    const key = format(new Date(sw.scheduledDate), "yyyy-MM-dd");
    if (!swByDay[key]) swByDay[key] = [];
    swByDay[key].push({ id: sw.id, name: sw.workoutTypeName ?? "Workout", status: sw.status, duration: sw.duration, source: (sw as any).source ?? "manual" });
  }
  // WorkoutLogs show as DONE entries (they're already completed)
  for (const log of workoutLogs) {
    const key = format(new Date(log.startedAt), "yyyy-MM-dd");
    if (!swByDay[key]) swByDay[key] = [];
    // Avoid duplicates if a ScheduledWorkout already references this log
    const alreadyLinked = scheduledWorkouts.some((sw) => sw.workoutLogId === log.id);
    if (!alreadyLinked) {
      swByDay[key].push({ id: log.id, name: log.workoutName, status: "DONE", duration: log.durationMin, source: "imported" });
    }
  }

  const completionsByDay: Record<string, Array<{ status: "DONE" | "MISSED" | "SKIPPED" | "PENDING" }>> = {};
  for (const c of completions) {
    const key = format(new Date(c.date), "yyyy-MM-dd");
    if (!completionsByDay[key]) completionsByDay[key] = [];
    completionsByDay[key].push({ status: c.status as "DONE" | "MISSED" | "SKIPPED" | "PENDING" });
  }

  // Build 365-day heatmap (past year)
  const heatmapStart = new Date();
  heatmapStart.setFullYear(heatmapStart.getFullYear() - 1);
  const heatmapEnd = new Date();

  const [heatmapScheduled, heatmapLogs, heatmapCompletions] = await Promise.all([
    prisma.scheduledWorkout.findMany({
      where: { userId, scheduledDate: { gte: heatmapStart, lte: heatmapEnd }, status: "DONE" },
      select: { scheduledDate: true, workoutLogId: true },
    }),
    prisma.workoutLog.findMany({
      where: { userId, startedAt: { gte: heatmapStart, lte: heatmapEnd } },
      select: { startedAt: true, id: true },
    }),
    prisma.habitCompletion.findMany({
      where: { userId, date: { gte: heatmapStart, lte: heatmapEnd } },
      select: { date: true },
    }),
  ]);

  const heatmapByDay: Record<string, number> = {};
  const linkedLogIds = new Set(heatmapScheduled.map((s) => s.workoutLogId).filter(Boolean));
  for (const w of heatmapScheduled) {
    const key = format(new Date(w.scheduledDate), "yyyy-MM-dd");
    heatmapByDay[key] = (heatmapByDay[key] ?? 0) + 2;
  }
  for (const log of heatmapLogs) {
    if (!linkedLogIds.has(log.id)) {
      const key = format(new Date(log.startedAt), "yyyy-MM-dd");
      heatmapByDay[key] = (heatmapByDay[key] ?? 0) + 2;
    }
  }
  for (const c of heatmapCompletions) {
    const key = format(new Date(c.date), "yyyy-MM-dd");
    heatmapByDay[key] = (heatmapByDay[key] ?? 0) + 1;
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <MonthView
      monthLabel={monthLabel}
      prevMonth={prevMonth}
      nextMonth={nextMonth}
      todayStr={todayStr}
      monthStartDay={monthStart.getDay()} // 0=Sun
      daysInMonth={eachDayOfInterval({ start: monthStart, end: monthEnd }).map((d) => {
        const key = format(d, "yyyy-MM-dd");
        const workouts = swByDay[key] ?? [];
        const dayCompletions = completionsByDay[key] ?? [];
        return {
          dateStr: key,
          dayNum: format(d, "d"),
          workouts,
          habitCompletions: dayCompletions,
          totalHabitsForDay: habits, // simplification: all active habits expected daily
        };
      })}
      goals={goals.map((g) => ({
        id: g.id,
        title: g.title ?? "",
        status: g.status,
        category: g.category ?? "lifestyle",
        targetValue: g.targetValue,
        startValue: g.startValue,
        currentValue: g.currentValue,
        unit: g.unit,
        predictedHitDate: g.predictedHitDate?.toISOString() ?? null,
        deadline: g.deadline?.toISOString() ?? null,
      }))}
      heatmap={heatmapByDay}
    />
  );
}
