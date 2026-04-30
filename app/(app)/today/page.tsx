import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodayView } from "./TodayView";
import { RitualView } from "./RitualView";
import { userTodayStr, localMidnightUTC } from "@/lib/time/today";
import { constraintAppliesToDate } from "@/lib/coach/constraints";
import { getOrGenerateTodayHeadline } from "@/lib/dashboard/headline";
import type { SignalsData } from "@/components/dashboard/SignalsSection";

function computeLevel(totalXp: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 50)));
  const currentFloor = 50 * level * (level + 1);
  const nextFloor = 50 * (level + 1) * (level + 2);
  return { level, totalXp, xpToNext: nextFloor - totalXp, xpInLevel: totalXp - currentFloor };
}

function defaultHeadline(connected: boolean): string {
  return connected
    ? "Your dashboard. Numbers fill in as your wearable syncs."
    : "Connect Apple Health to see your numbers here.";
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

  // Last-7-days bounds for sparkline + baselines
  const sevenDaysAgo = new Date(todayDate);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  const baselineFrom = new Date(todayDate);
  baselineFrom.setUTCDate(baselineFrom.getUTCDate() - 7);

  const [
    habits,
    scheduledWorkouts,
    weeklyTargets,
    notifications,
    weeklyDoneScheduled,
    weeklyDoneLogs,
    hasGoals,
    todayHealthMetrics,
    last7Steps,
    baselineRows,
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

    // Today's HealthDaily metrics (canonical, multi-source). The dashboard
    // tile grid reads from this; HaeDaily is the HAE-specific roll-up that
    // feeds it. New for the Track WD dashboard rebuild.
    prisma.healthDaily.findMany({
      where: {
        userId,
        date: todayDate,
        metric: { in: ["steps", "activeMinutes", "caloriesActive", "sleepHours", "hrvMs", "restingHr"] },
      },
      select: { metric: true, value: true },
    }),

    // Last 7 days of steps for the week sparkline
    prisma.healthDaily.findMany({
      where: { userId, metric: "steps", date: { gte: sevenDaysAgo, lte: todayDate } },
      select: { date: true, value: true },
    }),

    // Baseline (last 7 days excl. today) — used for delta captions on
    // sleep / HRV / resting HR. We only need the steady-state metrics
    // here since steps already has its own pace estimator.
    prisma.healthDaily.findMany({
      where: {
        userId,
        date: { gte: baselineFrom, lt: todayDate },
        metric: { in: ["sleepHours", "hrvMs", "restingHr"] },
      },
      select: { metric: true, value: true },
    }),
  ]);

  // Merge weekly done counts from both sources (scheduled completions + ad-hoc logs)
  const doneCounts: Record<string, number> = {};
  const addCount = (name: string | null | undefined) => {
    if (!name) return;
    doneCounts[name] = (doneCounts[name] ?? 0) + 1;
  };
  for (const w of weeklyDoneScheduled) addCount(w.workoutTypeName);
  for (const w of weeklyDoneLogs) addCount(w.workoutName);

  // GLP-1 widget suppressed — feature hidden pending re-enable
  const glp1Profile = null;

  const { level, totalXp, xpToNext, xpInLevel } = computeLevel(user.totalXp);
  const xpPct = Math.min(100, (xpInLevel / Math.max(1, xpInLevel + xpToNext)) * 100);

  const completedIds = new Set(completions.map((c) => c.habitId));
  const dueHabits = habits.filter((h) => isHabitDueToday(h.cadence, h.specificDays, timezone));

  // Map of HealthDaily metric -> today's value, used to render wearable
  // habit progress bars without an extra DB query per habit.
  const todayMetricMap: Record<string, number> = {};
  for (const r of todayHealthMetrics) todayMetricMap[r.metric] = r.value;

  const habitsForView = dueHabits.map((h) => {
    const trackingMode = h.trackingMode;
    const metricKey = h.metricKey;
    const metricTarget = h.metricTarget;
    const wearableValue = metricKey ? (todayMetricMap[metricKey] ?? null) : null;
    return {
      id: h.id,
      title: h.title,
      icon: h.icon ?? "CheckCircle",
      duration: h.duration,
      pointsOnComplete: h.pointsOnComplete,
      done: completedIds.has(h.id),
      trackingMode,
      metricKey,
      metricTarget,
      wearableValue,
    };
  });

  // Steps target: prefer the user's actual habit target if they have a
  // wearable steps habit, otherwise fall back to 10k.
  const stepsHabit = habits.find((h) => h.metricKey === "steps" && h.trackingMode !== "MANUAL");
  const stepsTargetUser = stepsHabit?.metricTarget ?? null;
  const activeMinHabit = habits.find((h) => h.metricKey === "activeMinutes" && h.trackingMode !== "MANUAL");
  const activeMinTargetUser = activeMinHabit?.metricTarget ?? null;

  // Baseline averages (last 7 days, excl today)
  const avgFor = (metric: string): number | null => {
    const vals = baselineRows.filter((r) => r.metric === metric).map((r) => r.value);
    if (vals.length < 3) return null; // need at least 3 readings
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  // Build last-7-days steps array, oldest first, with nulls for missing days
  const stepsByDate = new Map<string, number>();
  for (const r of last7Steps) {
    stepsByDate.set(r.date.toISOString().split("T")[0], r.value);
  }
  const stepsLast7: { date: string; value: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().split("T")[0];
    stepsLast7.push({ date: key, value: stepsByDate.get(key) ?? null });
  }

  // Headline. We tolerate a slow LLM by capping the wait; if it exceeds
  // the budget we render nothing rather than freezing the page. The
  // morning Inngest job pre-fills future days so this rarely runs inline.
  const headlineResult = await Promise.race([
    getOrGenerateTodayHeadline(userId).catch(() => ({ text: "", cached: false })),
    new Promise<{ text: string; cached: boolean }>((resolve) =>
      setTimeout(() => resolve({ text: "", cached: false }), 4000),
    ),
  ]);

  const isApplehealthConnected = !!(healthIntegration && healthIntegration.active);

  const signalsData: SignalsData | null = (isApplehealthConnected || todayHealthMetrics.length > 0)
    ? {
        headline: headlineResult.text || defaultHeadline(isApplehealthConnected),
        isApplehealthConnected,
        today: {
          steps: todayMetricMap.steps ?? null,
          activeMinutes: todayMetricMap.activeMinutes ?? null,
          caloriesActive: todayMetricMap.caloriesActive ?? null,
          sleepHours: todayMetricMap.sleepHours ?? null,
          hrvMs: todayMetricMap.hrvMs ?? null,
          restingHr: todayMetricMap.restingHr ?? null,
        },
        baseline: {
          sleepHours: avgFor("sleepHours"),
          hrvMs: avgFor("hrvMs"),
          restingHr: avgFor("restingHr"),
        },
        targets: {
          steps: stepsTargetUser,
          activeMinutes: activeMinTargetUser,
        },
        stepsLast7,
      }
    : null;

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

  // Planner banner — recent re-plan + active constraints applying today
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const replanSuggestion = await prisma.chatSuggestion.findFirst({
    where: { userId, type: "PLAN_REPLANNED", dismissed: false, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  const activeConstraints = await prisma.plannerConstraint.findMany({
    where: { userId, active: true },
  });
  const constraintsToday = activeConstraints
    .filter((c) => constraintAppliesToDate(c, todayDate))
    .map((c) => ({
      id: c.id,
      type: c.type,
      reason: c.reason,
      endDate: c.endDate ? c.endDate.toISOString().split("T")[0] : null,
    }));

  const replanForView = replanSuggestion ? {
    id: replanSuggestion.id,
    title: replanSuggestion.title,
    body: replanSuggestion.body,
    payload: (replanSuggestion.payload as object) as {
      constraintId: string;
      constraintReason: string;
      movedDetails: Array<{ workoutId: string; name: string; fromDate: string; toDate: string | null; reason: string }>;
      createdAt: string;
    } | null,
  } : null;

  // Most recent unread encouragement from the user's accountability partner.
  // Hidden once the user has opened it (readAt set).
  const recentEnc = await prisma.partnerEncouragement.findFirst({
    where: {
      partner: { userId, status: "ACCEPTED" },
      readAt: null,
    },
    orderBy: { sentAt: "desc" },
    include: { partner: { select: { partnerName: true } } },
  });
  const partnerNote = recentEnc ? {
    id: recentEnc.id,
    partnerName: recentEnc.partner.partnerName,
    message: recentEnc.message,
    sentAt: recentEnc.sentAt.toISOString(),
  } : null;

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
        readinessScore={readinessScore}
        glp1Active={false}
        plannerReplan={replanForView}
        plannerConstraintsToday={constraintsToday}
        partnerNote={partnerNote}
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
      plannerReplan={replanForView}
      plannerConstraintsToday={constraintsToday}
      partnerNote={partnerNote}
      signalsData={signalsData}
    />
  );
}
