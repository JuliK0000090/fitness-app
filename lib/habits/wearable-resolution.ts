/**
 * Wearable-driven habit resolution.
 *
 * A habit with `trackingMode != MANUAL` resolves itself from HealthDaily
 * instead of requiring a user tap. At end-of-day (Phase 3) an Inngest
 * job calls `resolveWearableHabit` for every active wearable habit and
 * writes a HabitCompletion row. During the day the dashboard uses
 * `currentWearableProgress` to render a live progress bar.
 *
 * IMPORTANT: HealthDaily is row-per-metric, NOT column-per-metric.
 * Unique key is `(userId, date, metric)` and `metric` is a string
 * (e.g. "steps", "sleepHours", "activeMinutes", "restingHr", "hrvMs").
 * `Habit.metricKey` matches HealthDaily.metric directly.
 */

import { prisma } from "@/lib/prisma";
import { userToday } from "@/lib/time/today";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export type WearableResolution = {
  resolved: boolean;
  status: "DONE" | "MISSED";
  actualValue: number | null;
};

/**
 * Resolve a wearable-tracked habit for a specific local date. Reads
 * HealthDaily for that (userId, date, metric=metricKey) and returns
 * DONE if (value <comparison> target) holds, MISSED otherwise.
 *
 * Returns `resolved: false` (with status MISSED, value null) when the
 * habit can't be resolved yet — missing daily row, missing config, or
 * trackingMode === MANUAL. Callers should treat unresolved as "no
 * decision yet" and not write a HabitCompletion.
 */
export async function resolveWearableHabit(
  habitId: string,
  date: Date,
): Promise<WearableResolution> {
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) return unresolved();
  if (habit.trackingMode === "MANUAL") return unresolved();
  if (!habit.metricKey || habit.metricTarget == null || !habit.metricComparison) {
    return unresolved();
  }

  const daily = await prisma.healthDaily.findUnique({
    where: {
      userId_date_metric: {
        userId: habit.userId,
        date,
        metric: habit.metricKey,
      },
    },
  });
  if (!daily) return unresolved();

  const value = daily.value;
  const met = compareMetric(value, habit.metricComparison, habit.metricTarget);

  return {
    resolved: true,
    status: met ? "DONE" : "MISSED",
    actualValue: value,
  };
}

export type WearableProgress = {
  value: number | null;
  target: number;
  comparison: "GTE" | "LTE" | "EQ";
  /**
   * For GTE-style closing-the-gap habits: true if the user is on track
   * to hit target by end of "active day" (5pm-ish). null when we can't
   * compute pace — LTE/EQ habits, or when HealthDaily for today is
   * missing entirely.
   */
  onPace: boolean | null;
  /** Already met today. */
  done: boolean;
};

/**
 * Live progress for a wearable habit, evaluated against today (in the
 * user's timezone). Returns `value: null` when HealthDaily for today
 * doesn't exist yet — usually means HAE hasn't synced in the last few
 * hours, not that the user has zero steps.
 */
export async function currentWearableProgress(
  habitId: string,
): Promise<WearableProgress | null> {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    include: { user: { select: { timezone: true } } },
  });
  if (!habit) return null;
  if (habit.trackingMode === "MANUAL") return null;
  if (!habit.metricKey || habit.metricTarget == null || !habit.metricComparison) {
    return null;
  }

  const tz = habit.user.timezone ?? "UTC";
  const today = userToday(tz);

  const daily = await prisma.healthDaily.findUnique({
    where: {
      userId_date_metric: {
        userId: habit.userId,
        date: today,
        metric: habit.metricKey,
      },
    },
  });

  const value = daily?.value ?? null;
  const target = habit.metricTarget;
  const comparison = habit.metricComparison as "GTE" | "LTE" | "EQ";

  const done = value !== null && compareMetric(value, comparison, target);
  const onPace = computeOnPace(value, target, comparison, tz);

  return { value, target, comparison, onPace, done };
}

// ── Internal ─────────────────────────────────────────────────────────────────

function unresolved(): WearableResolution {
  return { resolved: false, status: "MISSED", actualValue: null };
}

function compareMetric(value: number, comparison: string, target: number): boolean {
  if (comparison === "GTE") return value >= target;
  if (comparison === "LTE") return value <= target;
  if (comparison === "EQ") return value === target;
  return false;
}

/**
 * Pace calc for closing-the-gap (GTE) habits. We assume the "active
 * portion" of the day ends ~17:00 local — by then a typical user has
 * accumulated most of their steps/active minutes. After 17:00, expected
 * progress saturates at 100%.
 *
 * onPace = (currentValue / target) >= expectedFractionOfTarget(now).
 *
 * For LTE/EQ this concept doesn't apply and we return null.
 */
function computeOnPace(
  value: number | null,
  target: number,
  comparison: "GTE" | "LTE" | "EQ",
  timezone: string,
): boolean | null {
  if (comparison !== "GTE") return null;
  if (value === null) return null;
  if (value >= target) return true;

  const localHour = userLocalHourFractional(timezone);
  const ACTIVE_DAY_END = 17;
  const expectedFraction = Math.min(localHour / ACTIVE_DAY_END, 1);
  if (expectedFraction <= 0) return value > 0;

  return value / target >= expectedFraction;
}

function userLocalHourFractional(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return h + m / 60;
}

void db; // reserved for forthcoming bulk-resolution helper
