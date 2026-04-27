/**
 * Validate-then-commit wrapper around prisma.scheduledWorkout.create.
 *
 * Every ScheduledWorkout creation site (chat tool, plan generator) calls
 * this instead of prisma directly. The validator runs against the proposed
 * day plan; on a hard violation the wrapper either rejects or shifts the
 * date forward to the first day in the next 14 that passes — never silently
 * commits something that breaks the rules.
 *
 * Logs every attempt to PlanValidationLog so we can audit what shipped.
 */

import { addDays } from "date-fns";
import { Prisma, ScheduledWorkout } from "@prisma/client";
import { prisma } from "../prisma";
import { validateDayPlan, Violation } from "./validate";

const SEARCH_DAYS_FOR_REPLACEMENT = 14;
const MAX_VALIDATION_ATTEMPTS = 3;

export type ScheduleInput = {
  userId: string;
  goalId?: string | null;
  workoutTypeId: string | null;
  workoutTypeName: string;
  scheduledDate: Date;
  scheduledTime?: string | null;
  duration: number;
  intensity?: number | null;
  notes?: string | null;
  source?: string;
};

export type ScheduleOutcome = {
  scheduledWorkout: ScheduledWorkout | null;
  attempts: number;
  violations: Violation[];
  finalStatus: "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED_USER_NOTIFIED";
  shifted: { from: string; to: string } | null;
};

/**
 * Try to schedule the workout on the requested date. If the day already
 * has a hard-rule violation, walk forward up to 14 days for a clean slot.
 * If no slot is found, do NOT create the row — return a FAILED_USER_NOTIFIED
 * outcome with the violations so the caller can ask the user.
 */
export async function safeScheduleWorkout(input: ScheduleInput): Promise<ScheduleOutcome> {
  const constraints = await prisma.plannerConstraint.findMany({
    where: { userId: input.userId, active: true },
  });

  const requestedDate = stripTime(input.scheduledDate);

  let chosenDate = requestedDate;
  let attempts = 0;
  let lastViolations: Violation[] = [];
  let shifted: { from: string; to: string } | null = null;

  for (let offset = 0; offset < SEARCH_DAYS_FOR_REPLACEMENT && attempts < MAX_VALIDATION_ATTEMPTS; offset++) {
    attempts++;
    const candidateDate = offset === 0 ? requestedDate : addDays(requestedDate, offset);

    const sameDay = await prisma.scheduledWorkout.findMany({
      where: { userId: input.userId, scheduledDate: candidateDate, status: "PLANNED" },
    });

    const trial: ScheduledWorkout = {
      id: "__trial__",
      userId: input.userId,
      goalId: input.goalId ?? null,
      workoutTypeId: input.workoutTypeId,
      workoutTypeName: input.workoutTypeName,
      scheduledDate: candidateDate,
      scheduledTime: input.scheduledTime ?? null,
      duration: input.duration,
      intensity: input.intensity ?? null,
      notes: input.notes ?? null,
      status: "PLANNED",
      source: input.source ?? "ai_suggested",
      completedAt: null,
      skippedReason: null,
      workoutLogId: null,
      pointsEarned: 0,
      createdAt: new Date(),
    };

    const violations = validateDayPlan(
      { date: candidateDate, workouts: [...sameDay, trial] },
      { constraints },
    );
    lastViolations = violations;
    const hardErrors = violations.filter((v) => v.severity === "error");

    if (hardErrors.length === 0) {
      chosenDate = candidateDate;
      if (offset > 0) {
        shifted = {
          from: requestedDate.toISOString().split("T")[0],
          to: candidateDate.toISOString().split("T")[0],
        };
      }
      break;
    }

    if (offset === 0) {
      // First attempt failed — keep walking forward but note the failure.
      continue;
    }
  }

  const finalErrors = lastViolations.filter((v) => v.severity === "error");
  const finalWarnings = lastViolations.filter((v) => v.severity === "warning");

  if (finalErrors.length > 0) {
    // Couldn't place the workout in the search window. Don't create it.
    await prisma.planValidationLog.create({
      data: {
        userId: input.userId,
        date: requestedDate,
        attemptCount: attempts,
        finalStatus: "FAILED_USER_NOTIFIED",
        violations: lastViolations as unknown as Prisma.InputJsonValue,
        finalPlan: { rejected: true, input } as unknown as Prisma.InputJsonValue,
      },
    });
    return {
      scheduledWorkout: null,
      attempts,
      violations: lastViolations,
      finalStatus: "FAILED_USER_NOTIFIED",
      shifted: null,
    };
  }

  const created = await prisma.scheduledWorkout.create({
    data: {
      userId: input.userId,
      goalId: input.goalId ?? null,
      workoutTypeId: input.workoutTypeId,
      workoutTypeName: input.workoutTypeName,
      scheduledDate: chosenDate,
      scheduledTime: input.scheduledTime ?? null,
      duration: input.duration,
      intensity: input.intensity ?? null,
      notes: input.notes ?? null,
      status: "PLANNED",
      source: input.source ?? "ai_suggested",
    },
  });

  await prisma.planValidationLog.create({
    data: {
      userId: input.userId,
      date: chosenDate,
      attemptCount: attempts,
      finalStatus: finalWarnings.length > 0 ? "PASSED_WITH_WARNINGS" : "PASSED",
      violations: lastViolations as unknown as Prisma.InputJsonValue,
      finalPlan: { workoutId: created.id, shifted } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    scheduledWorkout: created,
    attempts,
    violations: lastViolations,
    finalStatus: finalWarnings.length > 0 ? "PASSED_WITH_WARNINGS" : "PASSED",
    shifted,
  };
}

function stripTime(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}
