export type HabitCadenceStr = "daily" | "weekly_n" | "specific_days" | "every_other" | "weekdays" | "weekends";

export type PresetHabit = {
  title: string;
  cadence: HabitCadenceStr;
  targetPerWeek?: number;
  specificDays?: number[]; // 0=Sun, 1=Mon … 6=Sat
  duration?: number; // minutes
  icon: string; // Lucide icon name
  pointsOnComplete?: number;
};

export type PresetWorkout = {
  workoutTypeName: string;
  timesPerWeek: number;
  duration: number; // minutes
  icon: string;
};

export type GoalPreset = {
  slug: string;
  title: string;
  category: string;
  matches: string[]; // phrases that trigger this preset (lowercase)
  defaultHabits: PresetHabit[];
  defaultWorkouts: PresetWorkout[];
  defaultMeasurements: string[]; // metric keys
  suggestedDeadlineWeeks: number;
};

export const GOAL_PRESETS: GoalPreset[] = [
  {
    slug: "victorias_secret",
    title: "Victoria's Secret body",
    category: "aesthetic",
    matches: ["victoria", "lean model", "model body", "lean and long", "long and lean", "pilates body"],
    defaultHabits: [
      { title: "10,000 steps", cadence: "daily", icon: "Footprints", pointsOnComplete: 15 },
      { title: "50-min stretching", cadence: "daily", duration: 50, icon: "Activity" },
      { title: "Stomach vacuum — 5 min", cadence: "daily", duration: 5, icon: "Wind" },
      { title: "Vibration plate — 10 min", cadence: "daily", duration: 10, icon: "Zap" },
      { title: "LED mask — 20 min", cadence: "daily", duration: 20, icon: "Sun" },
      { title: "2.5 L water", cadence: "daily", icon: "Droplets", pointsOnComplete: 15 },
    ],
    defaultWorkouts: [
      { workoutTypeName: "Hot Pilates", timesPerWeek: 3, duration: 55, icon: "Flame" },
      { workoutTypeName: "Reformer Pilates", timesPerWeek: 3, duration: 55, icon: "Activity" },
      { workoutTypeName: "Hot Yoga", timesPerWeek: 1, duration: 60, icon: "Flame" },
    ],
    defaultMeasurements: ["waist_cm", "hips_cm", "weight_kg", "body_fat_pct"],
    suggestedDeadlineWeeks: 16,
  },
  {
    slug: "strong_lean_runner",
    title: "Strong lean runner",
    category: "performance",
    matches: ["runner", "running", "5k", "10k", "marathon", "run faster", "cardio fitness"],
    defaultHabits: [
      { title: "Morning stretch — 15 min", cadence: "daily", duration: 15, icon: "Activity" },
      { title: "2 L water", cadence: "daily", icon: "Droplets" },
      { title: "Foam roll — 10 min", cadence: "daily", duration: 10, icon: "Circle" },
    ],
    defaultWorkouts: [
      { workoutTypeName: "Running", timesPerWeek: 4, duration: 40, icon: "Activity" },
      { workoutTypeName: "Strength Training", timesPerWeek: 2, duration: 45, icon: "Dumbbell" },
      { workoutTypeName: "Yoga", timesPerWeek: 1, duration: 60, icon: "Wind" },
    ],
    defaultMeasurements: ["weight_kg", "body_fat_pct"],
    suggestedDeadlineWeeks: 12,
  },
  {
    slug: "glutes_curves",
    title: "Glutes and curves",
    category: "body-composition",
    matches: ["glute", "booty", "curves", "curvy", "hip", "peach", "butt"],
    defaultHabits: [
      { title: "Glute activation — 10 min", cadence: "daily", duration: 10, icon: "Zap" },
      { title: "10,000 steps", cadence: "daily", icon: "Footprints" },
      { title: "Protein target — 120 g", cadence: "daily", icon: "Beef" },
      { title: "2 L water", cadence: "daily", icon: "Droplets" },
    ],
    defaultWorkouts: [
      { workoutTypeName: "Strength Training", timesPerWeek: 3, duration: 60, icon: "Dumbbell" },
      { workoutTypeName: "Reformer Pilates", timesPerWeek: 2, duration: 55, icon: "Activity" },
      { workoutTypeName: "Hot Pilates", timesPerWeek: 1, duration: 55, icon: "Flame" },
    ],
    defaultMeasurements: ["hips_cm", "glute_cm", "waist_cm", "weight_kg"],
    suggestedDeadlineWeeks: 16,
  },
  {
    slug: "postpartum",
    title: "Postpartum rebuild",
    category: "health",
    matches: ["postpartum", "post partum", "after baby", "after birth", "postnatal", "new mom", "diastasis"],
    defaultHabits: [
      { title: "Pelvic floor exercises — 10 min", cadence: "daily", duration: 10, icon: "Heart" },
      { title: "Gentle walk — 20 min", cadence: "daily", duration: 20, icon: "Footprints" },
      { title: "2 L water", cadence: "daily", icon: "Droplets" },
    ],
    defaultWorkouts: [
      { workoutTypeName: "Walking", timesPerWeek: 5, duration: 30, icon: "Footprints" },
      { workoutTypeName: "Reformer Pilates", timesPerWeek: 2, duration: 45, icon: "Activity" },
    ],
    defaultMeasurements: ["waist_cm", "weight_kg"],
    suggestedDeadlineWeeks: 24,
  },
  {
    slug: "wedding",
    title: "Wedding countdown",
    category: "aesthetic",
    matches: ["wedding", "bride", "bridal", "engagement", "big day"],
    defaultHabits: [
      { title: "10,000 steps", cadence: "daily", icon: "Footprints" },
      { title: "2 L water", cadence: "daily", icon: "Droplets" },
      { title: "No alcohol", cadence: "daily", icon: "X" },
      { title: "Skin care routine", cadence: "daily", duration: 10, icon: "Sparkles" },
      { title: "Weekly progress photo", cadence: "weekly_n", targetPerWeek: 1, icon: "Camera" },
    ],
    defaultWorkouts: [
      { workoutTypeName: "Hot Pilates", timesPerWeek: 3, duration: 55, icon: "Flame" },
      { workoutTypeName: "Reformer Pilates", timesPerWeek: 2, duration: 55, icon: "Activity" },
      { workoutTypeName: "HIIT", timesPerWeek: 2, duration: 30, icon: "Zap" },
    ],
    defaultMeasurements: ["waist_cm", "hips_cm", "weight_kg"],
    suggestedDeadlineWeeks: 20,
  },
  {
    slug: "ballet_dancer",
    title: "Ballet / dancer body",
    category: "aesthetic",
    matches: ["ballet", "dancer", "ballerina", "barre", "splits", "flexibility", "graceful"],
    defaultHabits: [
      { title: "Deep stretch — 60 min", cadence: "daily", duration: 60, icon: "Activity" },
      { title: "Posture check", cadence: "daily", icon: "CheckCircle" },
      { title: "2 L water", cadence: "daily", icon: "Droplets" },
    ],
    defaultWorkouts: [
      { workoutTypeName: "Hot Pilates", timesPerWeek: 4, duration: 55, icon: "Flame" },
      { workoutTypeName: "Barre", timesPerWeek: 2, duration: 50, icon: "Activity" },
    ],
    defaultMeasurements: ["waist_cm", "weight_kg"],
    suggestedDeadlineWeeks: 20,
  },
  {
    slug: "healthy_reset",
    title: "Healthy reset",
    category: "lifestyle",
    matches: ["healthy", "reset", "feel better", "wellness", "health", "start fresh", "get fit", "lose weight", "lose fat"],
    defaultHabits: [
      { title: "8,000 steps", cadence: "daily", icon: "Footprints" },
      { title: "8 h sleep", cadence: "daily", icon: "Moon" },
      { title: "2 L water", cadence: "daily", icon: "Droplets" },
      { title: "No late-night snacking", cadence: "daily", icon: "X" },
    ],
    defaultWorkouts: [
      { workoutTypeName: "Walking", timesPerWeek: 5, duration: 30, icon: "Footprints" },
      { workoutTypeName: "Yoga", timesPerWeek: 2, duration: 45, icon: "Wind" },
      { workoutTypeName: "Strength Training", timesPerWeek: 2, duration: 40, icon: "Dumbbell" },
    ],
    defaultMeasurements: ["weight_kg", "waist_cm"],
    suggestedDeadlineWeeks: 12,
  },
  {
    slug: "build_muscle",
    title: "Build muscle",
    category: "performance",
    matches: ["muscle", "bulk", "strength", "stronger", "lift", "gym", "gains", "build"],
    defaultHabits: [
      { title: "Protein — 1.6 g/kg body weight", cadence: "daily", icon: "Beef", pointsOnComplete: 15 },
      { title: "2.5 L water", cadence: "daily", icon: "Droplets" },
      { title: "8 h sleep", cadence: "daily", icon: "Moon" },
    ],
    defaultWorkouts: [
      { workoutTypeName: "Strength Training", timesPerWeek: 4, duration: 60, icon: "Dumbbell" },
      { workoutTypeName: "Walking", timesPerWeek: 3, duration: 30, icon: "Footprints" },
    ],
    defaultMeasurements: ["weight_kg", "body_fat_pct"],
    suggestedDeadlineWeeks: 20,
  },
  {
    slug: "splits_flexibility",
    title: "Splits and flexibility",
    category: "performance",
    matches: ["split", "flexible", "flexibility", "stretch", "yoga body", "bendy"],
    defaultHabits: [
      { title: "Deep stretch — 30 min", cadence: "daily", duration: 30, icon: "Activity" },
      { title: "2 L water", cadence: "daily", icon: "Droplets" },
    ],
    defaultWorkouts: [
      { workoutTypeName: "Yoga", timesPerWeek: 3, duration: 60, icon: "Wind" },
      { workoutTypeName: "Hot Pilates", timesPerWeek: 2, duration: 55, icon: "Flame" },
    ],
    defaultMeasurements: ["waist_cm"],
    suggestedDeadlineWeeks: 16,
  },
  {
    slug: "marathon",
    title: "Marathon ready",
    category: "performance",
    matches: ["marathon", "half marathon", "long distance", "26.2", "13.1", "race", "endurance"],
    defaultHabits: [
      { title: "Foam roll — 15 min", cadence: "daily", duration: 15, icon: "Circle" },
      { title: "2.5 L water", cadence: "daily", icon: "Droplets" },
      { title: "8 h sleep", cadence: "daily", icon: "Moon" },
    ],
    defaultWorkouts: [
      { workoutTypeName: "Running", timesPerWeek: 4, duration: 45, icon: "Activity" },
      { workoutTypeName: "Strength Training", timesPerWeek: 1, duration: 45, icon: "Dumbbell" },
      { workoutTypeName: "Yoga", timesPerWeek: 1, duration: 45, icon: "Wind" },
    ],
    defaultMeasurements: ["weight_kg"],
    suggestedDeadlineWeeks: 16,
  },
];

/**
 * Match user's free-text goal to a preset (returns null for no match).
 */
export function matchPreset(text: string): GoalPreset | null {
  const lower = text.toLowerCase();
  // Score each preset by how many match phrases appear in the text
  let best: GoalPreset | null = null;
  let bestScore = 0;
  for (const preset of GOAL_PRESETS) {
    const score = preset.matches.filter((m) => lower.includes(m)).length;
    if (score > bestScore) {
      bestScore = score;
      best = preset;
    }
  }
  return bestScore > 0 ? best : null;
}
