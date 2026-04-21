// Source priority rules per metric
// First source in list with a non-zero value wins

const STEPS_PRIORITY = [
  "APPLE_WATCH", "GARMIN", "FITBIT", "POLAR", "SUUNTO",
  "OURA", "WHOOP", "ULTRAHUMAN",
  "APPLE", "SAMSUNG", "GOOGLE_FIT", "FREESTYLELIBRE",
  "MANUAL",
];

const SLEEP_PRIORITY = [
  "OURA", "WHOOP", "ULTRAHUMAN",
  "APPLE_WATCH", "GARMIN", "FITBIT", "POLAR",
  "APPLE", "SAMSUNG",
  "MANUAL",
];

const HR_PRIORITY = [
  "GARMIN", "POLAR", "SUUNTO",
  "APPLE_WATCH", "FITBIT", "WHOOP",
  "OURA",
  "MANUAL",
];

const METRIC_PRIORITY: Record<string, string[]> = {
  steps: STEPS_PRIORITY,
  activeMinutes: STEPS_PRIORITY,
  caloriesActive: STEPS_PRIORITY,
  distanceMeters: STEPS_PRIORITY,
  floorsClimbed: STEPS_PRIORITY,
  heartRateAvg: HR_PRIORITY,
  heartRateMax: HR_PRIORITY,
  heartRateMin: HR_PRIORITY,
  restingHr: HR_PRIORITY,
  hrvMs: ["OURA", "WHOOP", "GARMIN", "POLAR", "APPLE_WATCH", "FITBIT", "MANUAL"],
  sleepHours: SLEEP_PRIORITY,
  sleepEfficiency: SLEEP_PRIORITY,
  deepMin: SLEEP_PRIORITY,
  remMin: SLEEP_PRIORITY,
  lightMin: SLEEP_PRIORITY,
  readinessScore: ["OURA", "MANUAL"],
  recoveryScore: ["WHOOP", "MANUAL"],
  strainScore: ["WHOOP", "MANUAL"],
  weightKg: ["WITHINGS", "GARMIN", "FITBIT", "APPLE", "MANUAL"],
  bodyFatPct: ["WITHINGS", "GARMIN", "FITBIT", "APPLE", "MANUAL"],
  spo2: ["OURA", "WHOOP", "GARMIN", "APPLE_WATCH", "FITBIT", "MANUAL"],
  bodyTempDeltaC: ["OURA", "WHOOP", "MANUAL"],
};

export function pickWinner(
  metric: string,
  sources: Record<string, number>
): { source: string; value: number } | null {
  const priority = METRIC_PRIORITY[metric] ?? STEPS_PRIORITY;

  // Follow priority order
  for (const source of priority) {
    const val = sources[source];
    if (val !== undefined && val > 0) {
      return { source, value: val };
    }
  }

  // If nothing in priority list, pick highest non-zero value
  const entries = Object.entries(sources).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  entries.sort(([, a], [, b]) => b - a);
  return { source: entries[0][0], value: entries[0][1] };
}

export function getPriorityList(metric: string): string[] {
  return METRIC_PRIORITY[metric] ?? STEPS_PRIORITY;
}
