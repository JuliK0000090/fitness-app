/**
 * The eight temporal rules from CALENDAR_RULES.md, expressed as pure
 * functions. Every write path that mutates ScheduledWorkout.status,
 * HabitCompletion.status, or creates a WorkoutLog must pass through
 * the relevant validator before touching the DB.
 *
 * Calibrated to the actual schema:
 *   - WorkoutStatus:    PLANNED | DONE | SKIPPED | MOVED | MISSED | AUTO_SKIPPED
 *   - CompletionStatus: DONE | MISSED | SKIPPED | PENDING
 *   - "SUGGESTED" / "IN_PROGRESS" / "COMPLETED" exist in the spec but
 *     not in this codebase. ai_suggested rows live as PLANNED with
 *     `source = "ai_suggested"`.
 *
 * The rules:
 *   R1 PAST    : status may be DONE | SKIPPED | MISSED | MOVED | AUTO_SKIPPED. No PLANNED.
 *   R2 TODAY   : any status valid.
 *   R3 FUTURE  : status may only be PLANNED | MOVED. No DONE/SKIPPED/MISSED/AUTO_SKIPPED.
 *   R4 completedAt >= scheduledDate; completedAt <= now. (Enforced by DB CHECK.)
 *   R5 Reverse transitions (DONE → PLANNED) only via the explicit uncompleteWorkout
 *      flow. Direct status writes that try to undo are rejected.
 *   R6 "today" is User.timezone local, never server UTC.
 *   R7 UI must disable check-mark inputs on future dates. (Phase 4.)
 *   R8 HabitCompletion.date <= user-local-today. (Enforced by validator + DB CHECK.)
 */

import { CompletionStatus, WorkoutStatus } from "@prisma/client";
import { dayState, DayState } from "@/lib/time/user-today";

// ── Sets of status values per rule ───────────────────────────────────────────

const FUTURE_INVALID_WORKOUT_STATUSES: WorkoutStatus[] = [
  "DONE", "SKIPPED", "MISSED", "AUTO_SKIPPED",
];
const PAST_INVALID_WORKOUT_STATUSES: WorkoutStatus[] = [
  "PLANNED",
];
const FUTURE_INVALID_HABIT_STATUSES: CompletionStatus[] = [
  "DONE", "SKIPPED", "MISSED",
];

// ── Result type ──────────────────────────────────────────────────────────────

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string; code: string };

function deny(code: string, reason: string): ValidationResult {
  return { ok: false, code, reason };
}

// ── ScheduledWorkout status transitions ──────────────────────────────────────

export function validateWorkoutStatusChange(args: {
  scheduledDate: Date;
  userTimezone: string;
  currentStatus: WorkoutStatus;
  newStatus: WorkoutStatus;
}): ValidationResult {
  const phase = dayState(args.scheduledDate, args.userTimezone);

  // R3: future cannot be marked DONE/SKIPPED/MISSED/AUTO_SKIPPED.
  if (phase === "future" && FUTURE_INVALID_WORKOUT_STATUSES.includes(args.newStatus)) {
    return deny(
      "FUTURE_STATUS_NOT_ALLOWED",
      `Cannot set status=${args.newStatus} on ${args.scheduledDate.toISOString().split("T")[0]} — that date is in the future for the user.`,
    );
  }

  // R1: past cannot be PLANNED — past planned items become MISSED at end-of-day.
  if (phase === "past" && PAST_INVALID_WORKOUT_STATUSES.includes(args.newStatus)) {
    return deny(
      "PAST_PLANNED_NOT_ALLOWED",
      `Cannot set status=PLANNED on a past date — it should be MISSED instead.`,
    );
  }

  // R5: DONE → PLANNED is the un-complete flow. Force callers to use the
  // explicit uncompleteWorkout server action so XP refund + log delete
  // happen atomically. Direct status downgrades aren't allowed.
  if (args.currentStatus === "DONE" && args.newStatus === "PLANNED") {
    return deny(
      "USE_UNCOMPLETE_FLOW",
      `Cannot directly revert DONE to PLANNED. Use the uncompleteWorkout flow which atomically refunds XP and deletes the WorkoutLog.`,
    );
  }

  return { ok: true };
}

// ── HabitCompletion writes ───────────────────────────────────────────────────

export function validateHabitCompletionWrite(args: {
  date: Date;
  userTimezone: string;
  status: CompletionStatus;
}): ValidationResult {
  const phase = dayState(args.date, args.userTimezone);

  // R8: completion rows can only exist for past or today, never future.
  // R3-applied-to-habits: a future habit can't have a status of DONE/SKIPPED/MISSED.
  if (phase === "future") {
    if (FUTURE_INVALID_HABIT_STATUSES.includes(args.status)) {
      return deny(
        "FUTURE_HABIT_STATUS_NOT_ALLOWED",
        `Cannot record habit status=${args.status} on a future date.`,
      );
    }
    return deny(
      "FUTURE_HABIT_DATE_NOT_ALLOWED",
      `Cannot record a habit completion for a future date.`,
    );
  }

  return { ok: true };
}

// ── WorkoutLog creation (it's always a "DONE" record by definition) ──────────

export function validateWorkoutLogCreate(args: {
  startedAt: Date;
  userTimezone: string;
}): ValidationResult {
  // A WorkoutLog records something that already happened. Future means lying.
  const phase = dayState(args.startedAt, args.userTimezone);
  if (phase === "future") {
    return deny(
      "FUTURE_WORKOUT_LOG_NOT_ALLOWED",
      `Cannot log a workout that started ${args.startedAt.toISOString()} — that's in the user's future.`,
    );
  }
  // Also reject "after now" within today (e.g. user is at 09:00 and tries to
  // log a 23:00 workout — hasn't happened yet).
  if (args.startedAt.getTime() > Date.now()) {
    return deny(
      "FUTURE_WORKOUT_LOG_NOT_ALLOWED",
      `Cannot log a workout in the future. startedAt=${args.startedAt.toISOString()}, now=${new Date().toISOString()}.`,
    );
  }
  return { ok: true };
}

// ── Convenience for callers that just want a thrown Error ────────────────────

export function assertValid(result: ValidationResult): asserts result is { ok: true } {
  if (!result.ok) {
    throw new Error(`${result.code}: ${result.reason}`);
  }
}

export type { DayState };
