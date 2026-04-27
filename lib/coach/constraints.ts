/**
 * Planner-constraint helpers shared by the AI tool, the validator, the
 * replanner, and the settings UI. Treatment defaults are the single source
 * of truth — both Vita's tool call and the manual settings form pre-fill
 * from this table.
 *
 * See PLANNER.md for the full architecture overview.
 */

import { ConstraintScope, ConstraintType, PlannerConstraint, ScheduledWorkout } from "@prisma/client";

/** Treatment-specific defaults. Vita and the settings form both prefill from here. */
export const TREATMENT_DEFAULTS: Record<string, {
  label: string;
  durationDays: number;          // how many days of restriction by default
  restrictions: string[];        // e.g. ["heat", "sweat", "exercise"]
  notes: string;
}> = {
  microneedling: {
    label: "Microneedling",
    durationDays: 2,             // no heat/sweat 48h
    restrictions: ["heat", "sweat", "harsh_sun"],
    notes: "No heat or sweat for 48h. No makeup 24h. Avoid harsh sun for 7 days.",
  },
  botox: {
    label: "Botox",
    durationDays: 1,             // no exercise 24h
    restrictions: ["exercise", "inversions", "facial_massage"],
    notes: "No exercise 24h. No lying down 4h. No facial massage 14 days.",
  },
  filler: {
    label: "Filler",
    durationDays: 2,             // no heat 48h
    restrictions: ["exercise", "heat", "facial_massage"],
    notes: "No exercise 24h. No heat 48h. No facial massage 14 days.",
  },
  laser: {
    label: "Laser / IPL",
    durationDays: 1,
    restrictions: ["heat", "harsh_sun"],
    notes: "No heat 24h. Sun protection.",
  },
  chemical_peel: {
    label: "Chemical peel",
    durationDays: 7,
    restrictions: ["heat", "sweat", "harsh_sun"],
    notes: "No heat or sweat for 7 days. Strict sun protection.",
  },
  dental: {
    label: "Dental work",
    durationDays: 1,
    restrictions: ["exertion"],
    notes: "No exertion 24h. Soft food.",
  },
  massage: {
    label: "Massage",
    durationDays: 1,
    restrictions: ["intense_exercise"],
    notes: "Light activity only for 24h.",
  },
  surgery: {
    label: "Surgery",
    durationDays: 7,             // conservative default — Vita should ask user
    restrictions: ["exercise", "heat", "exertion"],
    notes: "Per surgeon's instructions. Conservative default: 7 days no exercise. Confirm with user.",
  },
};

export const TREATMENT_KEYS = Object.keys(TREATMENT_DEFAULTS);

/** Returns whether `date` falls inside the constraint's active window. */
export function constraintAppliesToDate(c: PlannerConstraint, date: Date): boolean {
  if (!c.active) return false;
  const d = stripTime(date).getTime();
  const start = stripTime(c.startDate).getTime();
  if (d < start) return false;
  if (c.endDate) {
    const end = stripTime(c.endDate).getTime();
    if (d > end) return false;
  }
  return true;
}

/** Heat-load activity detection — used by no-heat / no-sweat restrictions. */
export function isHeatedActivity(name: string | null | undefined): boolean {
  if (!name) return false;
  return /\b(hot|sauna|bikram|infrared|heated)\b/i.test(name);
}

/** Cardio-class detection — sweaty workouts that share the no-heat/no-sweat rule. */
export function isSweatyActivity(name: string | null | undefined): boolean {
  if (!name) return false;
  return isHeatedActivity(name) || /\b(run|hiit|spin|cardio|cycle)\b/i.test(name);
}

/** Returns true if the given workout violates any restriction tag. */
export function workoutViolatesRestriction(sw: Pick<ScheduledWorkout, "workoutTypeName">, restriction: string): boolean {
  const r = restriction.toLowerCase();
  const name = (sw.workoutTypeName || "").toLowerCase();

  if (r === "heat" || r === "sweat") return isSweatyActivity(name);
  if (r === "intense_exercise") return /\b(hiit|run|spin|heavy|max|intense)\b/i.test(name);
  if (r === "exercise" || r === "exertion") return true; // any workout violates "no exercise"
  if (r === "inversions") return /\b(yoga|pilates)\b/i.test(name);
  if (r === "facial_massage" || r === "facial") return /\b(facial|gua sha|face)\b/i.test(name);
  if (r === "harsh_sun") return /\b(outdoor|run|hike|beach)\b/i.test(name);
  return false;
}

/** Returns the first constraint that blocks a given workout on its scheduled date, or null. */
export function findBlockingConstraint(
  sw: Pick<ScheduledWorkout, "workoutTypeName" | "scheduledDate">,
  constraints: PlannerConstraint[],
): PlannerConstraint | null {
  for (const c of constraints) {
    if (!constraintAppliesToDate(c, sw.scheduledDate)) continue;

    const restrictions = extractRestrictions(c);
    for (const r of restrictions) {
      if (workoutViolatesRestriction(sw, r)) return c;
    }

    if (c.type === "INJURY") {
      const allowed: string[] = ((c.payload as Record<string, unknown>)?.allowedActivities as string[]) || [];
      const name = normalizeName(sw.workoutTypeName);
      const hits = allowed.length === 0 || allowed.some((a) => name.includes(normalizeName(a)));
      if (!hits) return c;
    }
  }
  return null;
}

/** Pulls the restriction tag list from any constraint payload. */
export function extractRestrictions(c: PlannerConstraint): string[] {
  const p = (c.payload as Record<string, unknown>) || {};
  const arr1 = (p.restrictions as string[]) || [];
  const arr2 = (p.restrictedTags as string[]) || [];
  return [...arr1, ...arr2];
}

/** Lowercase + strip non-alphanumerics so "Upper Body" and "upper_body" match. */
function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function stripTime(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

/**
 * Maps a treatment key to a fully-formed PlannerConstraint create payload.
 * Used by both the AI tool (when it detects "I have microneedling on Saturday")
 * and the settings template buttons.
 */
export function buildConstraintFromTreatment(args: {
  treatmentKey: string;
  startDate: Date;
  customRestrictions?: string[];
  customDurationDays?: number;
  customNotes?: string;
}): {
  type: ConstraintType;
  scope: ConstraintScope;
  startDate: Date;
  endDate: Date;
  payload: Record<string, unknown>;
  reason: string;
} {
  const tpl = TREATMENT_DEFAULTS[args.treatmentKey];
  if (!tpl) throw new Error(`Unknown treatment: ${args.treatmentKey}`);

  const restrictions = args.customRestrictions ?? tpl.restrictions;
  const days = args.customDurationDays ?? tpl.durationDays;
  const start = stripTime(args.startDate);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);

  return {
    type: "TREATMENT",
    scope: "HARD",
    startDate: start,
    endDate: end,
    payload: {
      treatmentName: tpl.label,
      treatmentKey: args.treatmentKey,
      restrictions,
      notes: args.customNotes ?? tpl.notes,
    },
    reason: `${tpl.label} — ${restrictions.join(", ")} for ${days}d`,
  };
}
