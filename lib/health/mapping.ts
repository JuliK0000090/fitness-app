export type MetricMapping = {
  metricType: string;
  unit?: string;
  aggregation: "sum" | "avg" | "max" | "min";
};

export const HAE_TO_VITA: Record<string, MetricMapping> = {
  step_count:                  { metricType: "steps",                aggregation: "max" },
  active_energy:               { metricType: "active_energy_kj",     unit: "kJ",  aggregation: "max" },
  basal_energy_burned:         { metricType: "resting_energy_kj",    unit: "kJ",  aggregation: "max" },
  heart_rate:                  { metricType: "heart_rate_avg",        unit: "bpm", aggregation: "avg" },
  resting_heart_rate:          { metricType: "heart_rate_resting",    unit: "bpm", aggregation: "avg" },
  walking_heart_rate_average:  { metricType: "heart_rate_walking",    unit: "bpm", aggregation: "avg" },
  heart_rate_variability:      { metricType: "hrv_ms",                unit: "ms",  aggregation: "avg" },
  sleep_analysis:              { metricType: "sleep_hours",           unit: "hr",  aggregation: "max" },
  apple_exercise_time:         { metricType: "exercise_minutes",      unit: "min", aggregation: "max" },
  apple_stand_hour:            { metricType: "stand_hours",           unit: "hr",  aggregation: "max" },
  walking_running_distance:    { metricType: "distance_km",           unit: "km",  aggregation: "max" },
  flights_climbed:             { metricType: "flights_climbed",                    aggregation: "max" },
  weight_body_mass:            { metricType: "weight_kg",             unit: "kg",  aggregation: "avg" },
  body_fat_percentage:         { metricType: "body_fat_pct",                       aggregation: "avg" },
  body_mass_index:             { metricType: "bmi",                                aggregation: "avg" },
  respiratory_rate:            { metricType: "respiratory_rate",      unit: "bpm", aggregation: "avg" },
  mindful_minutes:             { metricType: "mindful_minutes",       unit: "min", aggregation: "sum" },
  blood_oxygen_saturation:     { metricType: "spo2_pct",                          aggregation: "avg" },
  body_temperature:            { metricType: "body_temp_c",           unit: "C",   aggregation: "avg" },
};

export const SOURCE_PRIORITY = ["AppleWatch", "iPhone", "ThirdParty", "Manual"] as const;
export type SourcePriority = typeof SOURCE_PRIORITY[number];

export function inferSource(rawSource: string | undefined): SourcePriority {
  if (!rawSource) return "Manual";
  const s = rawSource.toLowerCase();
  if (s.includes("watch")) return "AppleWatch";
  if (s.includes("iphone") || s.includes("phone")) return "iPhone";
  if (s.includes("manual")) return "Manual";
  return "ThirdParty";
}

/** Pick the highest-priority source from a map of source→value */
export function pickBySourcePriority(values: Partial<Record<SourcePriority, number>>): { value: number; source: SourcePriority } | null {
  for (const src of SOURCE_PRIORITY) {
    if (values[src] !== undefined) return { value: values[src]!, source: src };
  }
  return null;
}

/** Alias for SourcePriority — used in newer code */
export type HealthSource = SourcePriority;

/** Return whichever source has higher priority (lower index wins) */
export function sourceWins(a: SourcePriority, b: SourcePriority): SourcePriority {
  return SOURCE_PRIORITY.indexOf(a) <= SOURCE_PRIORITY.indexOf(b) ? a : b;
}
