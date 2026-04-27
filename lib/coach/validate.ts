/**
 * Validator for a day's ScheduledWorkout rows.
 *
 * Hard rules return severity: "error" — the caller (generateAndCommitPlan)
 * must regenerate. Soft / advisory rules return "warning" — the plan ships
 * but the user is informed.
 *
 * The eight rules:
 *   R1  No duplicates within 24h          (HARD)
 *   R2  Max 2 workouts per day            (HARD, configurable)
 *   R3  Max 1 heated class per day        (HARD)
 *   R4  Min 4h between intense sessions   (HARD)
 *   R5  Active TREATMENT/ACTIVITY rules   (HARD if scope=HARD)
 *   R6  INJURY allowed-activities only    (HARD)
 *   R7  ILLNESS bars intensity ≥ 6        (WARNING)
 *   R8  TRAVEL equipment compatibility    (WARNING)
 *
 * See PLANNER.md for the full architecture.
 */

import { PlannerConstraint, ScheduledWorkout } from "@prisma/client";
import {
  constraintAppliesToDate,
  extractRestrictions,
  isHeatedActivity,
  workoutViolatesRestriction,
} from "./constraints";

export type Violation = {
  rule: string;
  severity: "error" | "warning";
  workoutId?: string;
  description: string;
  suggestedFix?: string;
};

export type DayPlan = {
  date: Date;
  workouts: ScheduledWorkout[];
};

export type ValidationContext = {
  constraints: PlannerConstraint[];
  yesterdayPlan?: DayPlan;
  tomorrowPlan?: DayPlan;
  maxWorkoutsPerDay?: number;
};

const DEFAULT_MAX_WORKOUTS = 2;
const INTENSITY_THRESHOLD_INTENSE = 7;
const INTENSITY_THRESHOLD_MODERATE = 6;
const MIN_GAP_BETWEEN_INTENSE_MINUTES = 240;

export function validateDayPlan(
  plan: DayPlan,
  ctx: ValidationContext,
): Violation[] {
  const violations: Violation[] = [];
  const max = ctx.maxWorkoutsPerDay ?? DEFAULT_MAX_WORKOUTS;

  // ── R1: no duplicates ──────────────────────────────────────────────────────
  const bySubtype = new Map<string, ScheduledWorkout[]>();
  for (const w of plan.workouts) {
    const key = (w.workoutTypeName || "untitled").toLowerCase().trim();
    const list = bySubtype.get(key) || [];
    list.push(w);
    bySubtype.set(key, list);
  }
  for (const [key, list] of bySubtype) {
    if (list.length > 1) {
      violations.push({
        rule: "no-duplicates",
        severity: "error",
        description: `${key} appears ${list.length}× on this day`,
        suggestedFix: "Keep one, move the others to different days",
      });
    }
  }

  // ── R2: max workouts per day ───────────────────────────────────────────────
  if (plan.workouts.length > max) {
    violations.push({
      rule: "max-workouts-per-day",
      severity: "error",
      description: `${plan.workouts.length} workouts scheduled — max is ${max}`,
    });
  }

  // ── R3: max 1 heated class per day ─────────────────────────────────────────
  const heated = plan.workouts.filter((w) => isHeatedActivity(w.workoutTypeName));
  if (heated.length > 1) {
    violations.push({
      rule: "max-heated-per-day",
      severity: "error",
      description: `${heated.length} heated classes on the same day — max is 1`,
      suggestedFix: "Move all but one heated class to other days",
    });
  }

  // ── R4: min 4h between intense sessions ────────────────────────────────────
  const intense = plan.workouts
    .filter((w) => (w.intensity ?? 5) >= INTENSITY_THRESHOLD_INTENSE && w.scheduledTime)
    .sort((a, b) => timeToMinutes(a.scheduledTime!) - timeToMinutes(b.scheduledTime!));
  for (let i = 1; i < intense.length; i++) {
    const prevEnd = timeToMinutes(intense[i - 1].scheduledTime!) + (intense[i - 1].duration ?? 45);
    const thisStart = timeToMinutes(intense[i].scheduledTime!);
    if (thisStart - prevEnd < MIN_GAP_BETWEEN_INTENSE_MINUTES) {
      violations.push({
        rule: "min-gap-between-intense",
        severity: "error",
        workoutId: intense[i].id,
        description: `Less than 4h between intense sessions`,
        suggestedFix: "Move the second intense workout to a different day or add a recovery gap",
      });
    }
  }

  // ── R5–R8: constraint-based rules ──────────────────────────────────────────
  for (const c of ctx.constraints) {
    if (!constraintAppliesToDate(c, plan.date)) continue;

    // R5: TREATMENT or ACTIVITY_RESTRICTION — restriction tags on workouts
    if (c.type === "TREATMENT" || c.type === "ACTIVITY_RESTRICTION") {
      const restrictions = extractRestrictions(c);
      for (const w of plan.workouts) {
        for (const r of restrictions) {
          if (workoutViolatesRestriction(w, r)) {
            violations.push({
              rule: `constraint-${c.id}`,
              severity: c.scope === "HARD" ? "error" : "warning",
              workoutId: w.id,
              description: `${w.workoutTypeName} conflicts with: ${c.reason}`,
              suggestedFix: `Move outside ${fmtRange(c.startDate, c.endDate)}`,
            });
            break; // one violation per workout per constraint is enough
          }
        }
      }
    }

    // R6: INJURY — if allowedActivities is set, every workout must match one
    if (c.type === "INJURY") {
      const allowed = ((c.payload as Record<string, unknown>)?.allowedActivities as string[]) || [];
      if (allowed.length > 0) {
        for (const w of plan.workouts) {
          const name = (w.workoutTypeName || "").toLowerCase();
          const ok = allowed.some((a) => name.includes(a.toLowerCase()));
          if (!ok) {
            const bodyPart = (c.payload as Record<string, unknown>)?.bodyPart || "injury";
            violations.push({
              rule: `injury-${c.id}`,
              severity: "error",
              workoutId: w.id,
              description: `${w.workoutTypeName} not allowed with ${bodyPart}`,
              suggestedFix: `Replace with one of: ${allowed.join(", ")}`,
            });
          }
        }
      }
    }

    // R7: ILLNESS — soft warning on intense work
    if (c.type === "ILLNESS") {
      for (const w of plan.workouts) {
        if ((w.intensity ?? 5) >= INTENSITY_THRESHOLD_MODERATE) {
          violations.push({
            rule: `illness-${c.id}`,
            severity: "warning",
            workoutId: w.id,
            description: `Intense workout while ${c.reason}`,
            suggestedFix: "Drop to mobility or rest",
          });
        }
      }
    }

    // R8: TRAVEL — workouts must work with available equipment
    if (c.type === "TRAVEL") {
      const t = c.payload as Record<string, unknown>;
      const equipment = (t.equipmentAvailable as string[]) || [];
      const inWindow = !t.departureDate || !t.returnDate
        ? true
        : plan.date >= new Date(t.departureDate as string) && plan.date <= new Date(t.returnDate as string);
      if (inWindow && equipment.length > 0) {
        for (const w of plan.workouts) {
          if (!equipment.some((e) => activityWorksWithEquipment(w.workoutTypeName, e))) {
            violations.push({
              rule: `travel-${c.id}`,
              severity: "warning",
              workoutId: w.id,
              description: `${w.workoutTypeName} requires equipment not available while traveling`,
              suggestedFix: "Replace with a bodyweight or hotel-gym version",
            });
          }
        }
      }
    }
  }

  return violations;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function activityWorksWithEquipment(name: string | null, equipment: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  const e = equipment.toLowerCase();
  if (e === "bodyweight") return /\b(bodyweight|yoga|pilates_mat|stretch|walk|run|core)\b/i.test(n);
  if (e === "hotel_gym") return /\b(strength|cardio|treadmill|bike|gym)\b/i.test(n);
  if (e === "reformer") return /\breformer\b/i.test(n);
  if (e === "studio") return /\b(reformer|pilates|barre|spin|hot|yoga)\b/i.test(n);
  return true; // unknown equipment: don't block
}

function fmtRange(start: Date, end: Date | null): string {
  const s = start.toISOString().split("T")[0];
  if (!end) return `from ${s} (ongoing)`;
  return `${s}–${end.toISOString().split("T")[0]}`;
}
