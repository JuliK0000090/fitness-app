/**
 * Constraint-driven re-planner.
 *
 * When a new PlannerConstraint is added (via chat tool or settings page),
 * this walks every PLANNED ScheduledWorkout in the constraint's date window
 * and:
 *   - if a workout violates the new constraint (or any other active one),
 *     mark it MOVED and try to find a non-conflicting future date in the
 *     next 14 days, otherwise leave it MOVED with no new date and let the
 *     end-of-day rollover surface it
 *   - emit a ChatSuggestion summarising the changes for the UI banner
 *
 * Returns a structured summary the AI tool can include verbatim in Vita's
 * reply.
 */

import { addDays } from "date-fns";
import { prisma } from "../prisma";
import { findBlockingConstraint } from "./constraints";
import { validateDayPlan } from "./validate";

export type ReplanResult = {
  datesUpdated: Date[];
  blocksMoved: number;
  movedDetails: Array<{
    workoutId: string;
    name: string;
    fromDate: string;
    toDate: string | null;
    reason: string;
  }>;
  summary: string;
};

const LOOKAHEAD_DAYS_DEFAULT = 60;
const SEARCH_DAYS_FOR_REPLACEMENT = 14;

export async function replanFromConstraint(
  constraintId: string,
  options: { notify?: boolean } = {},
): Promise<ReplanResult> {
  const c = await prisma.plannerConstraint.findUnique({ where: { id: constraintId } });
  if (!c) throw new Error("Constraint not found");

  const userId = c.userId;
  const startDate = c.startDate;
  const endDate = c.endDate ?? addDays(new Date(), LOOKAHEAD_DAYS_DEFAULT);

  // Load all active constraints (we re-validate against the full set, not
  // just the new one — adding a constraint may unmask older conflicts too).
  const allConstraints = await prisma.plannerConstraint.findMany({
    where: { userId, active: true },
  });

  const inRange = await prisma.scheduledWorkout.findMany({
    where: {
      userId,
      scheduledDate: { gte: startDate, lte: endDate },
      status: "PLANNED",
    },
  });

  const movedDetails: ReplanResult["movedDetails"] = [];
  const datesTouched = new Set<string>();

  for (const sw of inRange) {
    const blocker = findBlockingConstraint(sw, allConstraints);
    if (!blocker) continue;

    const fromDateStr = sw.scheduledDate.toISOString().split("T")[0];
    datesTouched.add(fromDateStr);

    // Try to find a non-conflicting date in the next 14 days starting just
    // after the blocking constraint's end (or just after the original date).
    const searchStart = blocker.endDate
      ? addDays(blocker.endDate, 1)
      : addDays(sw.scheduledDate, 1);

    let placed = false;
    for (let i = 0; i < SEARCH_DAYS_FOR_REPLACEMENT; i++) {
      const candidate = addDays(searchStart, i);
      const candidateMidnight = new Date(candidate);
      candidateMidnight.setUTCHours(0, 0, 0, 0);

      // Would this candidate violate any active constraint?
      const wouldBlock = findBlockingConstraint(
        { workoutTypeName: sw.workoutTypeName, scheduledDate: candidateMidnight },
        allConstraints,
      );
      if (wouldBlock) continue;

      // Would this candidate trip the per-day validator (duplicates,
      // max workouts, max heated, gap)? Pull the day's existing workouts
      // and run validate.
      const sameDay = await prisma.scheduledWorkout.findMany({
        where: { userId, scheduledDate: candidateMidnight, status: "PLANNED" },
      });
      const trial = [...sameDay, { ...sw, scheduledDate: candidateMidnight }];
      const dayViolations = validateDayPlan(
        { date: candidateMidnight, workouts: trial },
        { constraints: allConstraints },
      );
      if (dayViolations.some((v) => v.severity === "error")) continue;

      await prisma.scheduledWorkout.update({
        where: { id: sw.id },
        data: { scheduledDate: candidateMidnight, status: "MOVED", source: "ai_suggested" },
      });
      movedDetails.push({
        workoutId: sw.id,
        name: sw.workoutTypeName ?? "Workout",
        fromDate: fromDateStr,
        toDate: candidateMidnight.toISOString().split("T")[0],
        reason: blocker.reason,
      });
      datesTouched.add(candidateMidnight.toISOString().split("T")[0]);
      placed = true;
      break;
    }

    if (!placed) {
      // Couldn't find a slot in the search window — mark MOVED with no new
      // date so the user sees it in the suggestion drawer.
      await prisma.scheduledWorkout.update({
        where: { id: sw.id },
        data: { status: "MOVED" },
      });
      movedDetails.push({
        workoutId: sw.id,
        name: sw.workoutTypeName ?? "Workout",
        fromDate: fromDateStr,
        toDate: null,
        reason: blocker.reason,
      });
    }
  }

  const datesUpdated = Array.from(datesTouched).sort().map((s) => new Date(`${s}T00:00:00.000Z`));
  const summary = buildSummary(movedDetails, c.reason);

  if (options.notify !== false && movedDetails.length > 0) {
    await prisma.chatSuggestion.create({
      data: {
        userId,
        type: "PLAN_REPLANNED",
        title: "I updated your plan",
        body: summary,
        payload: {
          constraintId: c.id,
          constraintReason: c.reason,
          movedDetails,
          createdAt: new Date().toISOString(),
        } as object,
      },
    });
  }

  return {
    datesUpdated,
    blocksMoved: movedDetails.length,
    movedDetails,
    summary,
  };
}

function buildSummary(
  moved: ReplanResult["movedDetails"],
  constraintReason: string,
): string {
  if (moved.length === 0) {
    return `Constraint recorded: ${constraintReason}. No future workouts conflicted — your plan is unchanged.`;
  }
  const placed = moved.filter((m) => m.toDate);
  const orphans = moved.filter((m) => !m.toDate);
  const parts: string[] = [];
  if (placed.length > 0) {
    const lines = placed.map((m) => `${m.name}: ${m.fromDate} → ${m.toDate}`);
    parts.push(`Moved ${placed.length} workout${placed.length > 1 ? "s" : ""} (${constraintReason}): ${lines.join("; ")}`);
  }
  if (orphans.length > 0) {
    parts.push(
      `Could not auto-reschedule ${orphans.length}: ${orphans.map((m) => `${m.name} (${m.fromDate})`).join(", ")} — review on /month`,
    );
  }
  return parts.join(". ");
}
