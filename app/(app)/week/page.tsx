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

  const workouts = await prisma.workoutLog.findMany({
    where: { userId, startedAt: { gte: weekStart, lte: weekEnd } },
    orderBy: { startedAt: "asc" },
  });

  const checklistItems = await prisma.checklistItem.findMany({
    where: {
      userId,
      date: { in: days.map((d) => format(d, "yyyy-MM-dd")) },
    },
  });

  const weeklyReviews = await prisma.weeklyReview.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
    take: 4,
  });

  const dayData = days.map((d) => {
    const dateStr = format(d, "yyyy-MM-dd");
    const dayWorkouts = workouts.filter((w) => format(w.startedAt, "yyyy-MM-dd") === dateStr);
    const dayChecklist = checklistItems.filter((c) => c.date === dateStr);
    const doneTasks = dayChecklist.filter((c) => c.doneAt).length;
    return {
      date: dateStr,
      dayLabel: format(d, "EEE"),
      workoutCount: dayWorkouts.length,
      checklistDone: doneTasks,
      checklistTotal: dayChecklist.length,
      xp: dayWorkouts.length * 25 + doneTasks * 5,
    };
  });

  return (
    <WeekView
      weekLabel={`${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`}
      days={dayData}
      weeklyReviews={weeklyReviews.map((r) => ({
        id: r.id,
        weekOf: r.weekOf,
        adherencePct: r.adherencePct ?? 0,
        workoutsCompleted: r.workoutsCompleted,
        workoutsPlanned: r.workoutsPlanned,
        aiVerdict: r.aiSummary ?? "",
      }))}
    />
  );
}
