/**
 * Wire types for the /welcome onboarding flow. Shared between the
 * parse-goal API (output), the GoalDraftCard UI (props), and the
 * commit API (input).
 */

export type GoalCategory =
  | "body_composition"
  | "event_prep"
  | "performance"
  | "lifestyle"
  | "flexibility"
  | "strength";

export type HabitCadence = "DAILY" | "WEEKLY_N";

export type GoalDraftHabit = {
  title: string;
  cadence: HabitCadence;
  targetPerWeek?: number;
  durationMin?: number;
  timeOfDay?: "morning" | "afternoon" | "evening" | "any";
  points?: number;
};

export type GoalDraftWorkout = {
  workoutType: string;       // e.g. "Hot Pilates", "Reformer Pilates", "Hot Yoga"
  timesPerWeek: number;
};

export type GoalDraft = {
  title: string;
  category: GoalCategory;
  /** ISO YYYY-MM-DD or null. */
  deadline: string | null;
  habits: GoalDraftHabit[];
  workouts: GoalDraftWorkout[];
  measurements: string[];   // e.g. ["waist_cm", "weight_kg"]
  presetMatch: string | null;
};

export const CATEGORY_LABELS: Record<GoalCategory, string> = {
  body_composition: "Body composition",
  event_prep: "Event prep",
  performance: "Performance",
  lifestyle: "Lifestyle",
  flexibility: "Flexibility",
  strength: "Strength",
};
