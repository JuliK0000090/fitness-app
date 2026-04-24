import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodayView } from "./TodayView";
import { RitualView } from "./RitualView";
import { userTodayStr, localMidnightUTC } from "@/lib/time/today";

function computeLevel(totalXp: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 50)));
  const currentFloor = 50 * level * (level + 1);
  const nextFloor = 50 * (level + 1) * (level + 2);
  return { level, totalXp, xpToNext: nextFloor - totalXp, xpInLevel: totalXp - currentFloor };
}

function isHabitDueToday(cadence: string, specificDays: number[], timezone: string): boolean {
  const localDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  const dow = new Date(localDateStr + "T12:00:00Z").getUTCDay();
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

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, totalXp: true, currentStreak: true, timezone: true, todayMode: true },
  });

  const timezone = user.timezone ?? "UTC";
  const todayStr = userTodayStr(timezone);
  const todayDate = new Date(todayStr + "T00:00:00.000Z");

  // The UTC instant corresponding to local midnight — used to exclude completions
  // that happened yesterday evening but got stored with today's UTC date.
  const todayLocalMidnightUTC = localMidnightUTC(todayStr, timezone);

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  // Week bounds in UTC (for @db.Date scheduled workouts)
  const monday = new Date(todayDate);
  monday.setUTCDate(todayDate.getUTCDate() - ((todayDate.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  // Week bounds as timestamps for WorkoutLog (which uses a DateTime, not Date)
  const mondayStart = new Date(monday.toISOString().split("T")[0] + "T00:00:00.000Z");
  const sundayEnd = new Date(sunday.toISOString().split("T")[0] + "T23:59:59.999Z");

  // Filter by BOTH local date AND completedAt timestamp to prevent cross-midnight UTC bleed.
  // Falls back to date-only query if completedAt column doesn't exist yet (pre-migration).
  const completions: { habitId: string }[] = await (async () => {
    try {
      return await (prisma.habitCompletion as any).findMany({
        where: {
          userId,
          date: todayDate,
          status: "DONE",
          completedAt: { gte: todayLocalMidnightUTC },
        },
        select: { habitId: true },
      });
    } catch {
      return await prisma.habitCompletion.findMany({
        where: { userId, date: todayDate },
        select: { habitId: true },
      });
    }
  })();

  // Check if user has Apple Health connected (for banner) + today's health signals
  const [healthIntegration, healthToday] = await Promise.all([
    (prisma as any).healthIntegration.findUnique({
      where: { userId },
      select: { active: true, lastPayloadAt: true },
    }).catch(() => null),
    (prisma as any).haeDaily.findFirst({
      where: { userId, date: todayDate },
      select: { steps: true, readinessScore: true },
    }).catch(() => null),
  ]);
  const showHealthBanner = !healthIntegration || !healthIntegration.active;
  const todaySteps: number | null = healthToday?.steps ?? null;
  const readinessScore: number | null = healthToday?.readinessScore ?? null;

  const [
    habits,
    scheduledWorkouts,
    weeklyTargets,
    notifications,
    weeklyDoneScheduled,
    weeklyDoneLogs,
    hasGoals,
  ] = await Promise.all([
    prisma.habit.findMany({ where: { userId, active: true }, orderBy: { createdAt: "asc" } }),

    prisma.scheduledWorkout.findMany({
      where: { userId, scheduledDate: todayDate, status: { in: ["PLANNED", "MOVED"] } },
      orderBy: { scheduledTime: "asc" },
    }),

    prisma.weeklyTarget.findMany({
      where: { userId, active: true },
      include: { workoutType: { select: { name: true, icon: true } } },
    }),

    prisma.notification.findMany({ where: { userId, readAt: null }, orderBy: { createdAt: "desc" }, take: 3 }),

    // Scheduled workouts completed this week
    prisma.scheduledWorkout.findMany({
      where: { userId, scheduledDate: { gte: monday, lte: sunday }, status: "DONE" },
      select: { workoutTypeName: true, workoutTypeId: true },
    }),

    // Ad-hoc workout logs this week (from Vita's log_workout tool or manual logging)
    prisma.workoutLog.findMany({
      where: { userId, startedAt: { gte: mondayStart, lte: sundayEnd } },
      select: { workoutName: true, typeId: true },
    }),

    prisma.goal.count({ where: { userId, status: "active" } }).then((c) => c > 0),
  ]);

  // Merge weekly done counts from both sources (scheduled completions + ad-hoc logs)
  const doneCounts: Record<string, number> = {};
  const addCount = (name: string | null | undefined) => {
    if (!name) return;
    doneCounts[name] = (doneCounts[name] ?? 0) + 1;
  };
  for (const w of weeklyDoneScheduled) addCount(w.workoutTypeName);
  for (const w of weeklyDoneLogs) addCount(w.workoutName);

  // GLP-1 widget data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glp1Profile = await (prisma as any).gLP1Profile.findUnique({
    where: { userId },
    select: { active: true, proteinTargetG: true, resistanceMinTarget: true },
  }).catch(() => null);

  const { level, totalXp, xpToNext, xpInLevel } = computeLevel(user.totalXp);
  const xpPct = Math.min(100, (xpInLevel / Math.max(1, xpInLevel + xpToNext)) * 100);

  const completedIds = new Set(completions.map((c) => c.habitId));
  const dueHabits = habits.filter((h) => isHabitDueToday(h.cadence, h.specificDays, timezone));

  const habitsForView = dueHabits.map((h) => ({
    id: h.id,
    title: h.title,
    icon: h.icon ?? "CheckCircle",
    duration: h.duration,
    pointsOnComplete: h.pointsOnComplete,
    done: completedIds.has(h.id),
  }));

  const workoutsForView = scheduledWorkouts.map((sw) => ({
    id: sw.id,
    name: sw.workoutTypeName ?? "Workout",
    scheduledTime: sw.scheduledTime,
    duration: sw.duration,
    status: sw.status,
  }));

  const weeklyTargetsForView = weeklyTargets.map((wt) => ({
    id: wt.id,
    label: wt.workoutTypeName ?? wt.workoutType?.name ?? "Workout",
    icon: wt.workoutType?.icon ?? "Dumbbell",
    target: wt.targetCount,
    done: doneCounts[wt.workoutTypeName ?? ""] ?? doneCounts[wt.workoutType?.name ?? ""] ?? 0,
  }));

  const notificationsForView = notifications.map((n) => ({ id: n.id, title: n.title, body: n.body }));

  // Ritual mode: new users default to RITUAL; existing users default to DASHBOARD
  const todayMode = (user as any).todayMode ?? "DASHBOARD";

  if (todayMode === "RITUAL") {
    return (
      <RitualView
        userName={user.name ?? "there"}
        dateLabel={dateLabel}
        currentStreak={user.currentStreak}
        habits={habitsForView}
        scheduledWorkouts={workoutsForView}
        weeklyTargets={weeklyTargetsForView}
        hasGoals={hasGoals}
        readinessScore={readinessScore}
        glp1Active={glp1Profile?.active ?? false}
        glp1ProteinTargetG={glp1Profile?.proteinTargetG ?? null}
        glp1ResistanceMinTarget={glp1Profile?.resistanceMinTarget ?? null}
      />
    );
  }

  return (
    <TodayView
      userName={user.name ?? "there"}
      dateLabel={dateLabel}
      level={level}
      totalXp={totalXp}
      xpToNext={xpToNext}
      xpPct={xpPct}
      currentStreak={user.currentStreak}
      habits={habitsForView}
      scheduledWorkouts={workoutsForView}
      weeklyTargets={weeklyTargetsForView}
      notifications={notificationsForView}
      hasGoals={hasGoals}
      showHealthBanner={showHealthBanner}
      readinessScore={readinessScore}
      todaySteps={todaySteps}
    />
  );
}
