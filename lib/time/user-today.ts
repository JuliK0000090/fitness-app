/**
 * Day-state helpers in the USER's timezone, not the server's.
 *
 * Every write path that touches a date-bound row (ScheduledWorkout,
 * WorkoutLog, HabitCompletion) must call dayState() with the user's
 * stored timezone before deciding what's allowed. The Postgres CHECK
 * constraints are a UTC-only safety net; this is the precise check.
 *
 * Wraps the existing userTodayStr() in lib/time/today.ts so we have a
 * single import surface for calendar/temporal rules.
 */

import { userTodayStr } from "./today";

export type DayState = "past" | "today" | "future";

/**
 * Returns whether the given date is in the user's past, today, or future.
 *
 * `date` is treated as a date-only value: the YYYY-MM-DD portion of its
 * UTC representation is compared to the user's local YYYY-MM-DD. This
 * matches @db.Date storage semantics — a ScheduledWorkout dated
 * 2026-04-28 is "today" for an EDT user once their wall clock crosses
 * midnight on Apr 28, even though server UTC may already be Apr 28
 * earlier.
 *
 * For DateTime values (e.g. WorkoutLog.startedAt) the time portion is
 * dropped — we're asking "did this happen before, on, or after the
 * user's current calendar day?".
 */
export function dayState(date: Date, timezone: string): DayState {
  const todayStr = userTodayStr(timezone || "UTC");
  const dStr = date.toISOString().split("T")[0];
  if (dStr < todayStr) return "past";
  if (dStr > todayStr) return "future";
  return "today";
}

/** Convenience: true if the date is strictly past in the user's tz. */
export function isUserPast(date: Date, timezone: string): boolean {
  return dayState(date, timezone) === "past";
}

/** Convenience: true if the date is strictly future in the user's tz. */
export function isUserFuture(date: Date, timezone: string): boolean {
  return dayState(date, timezone) === "future";
}
