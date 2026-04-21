export { pickWinner } from "./priority";
export { computeTrust } from "./trust";

// Extract daily metric values from a Terra payload
export function extractMetricsFromPayload(
  provider: string,
  eventType: string,
  payload: unknown
): Array<{ date: string; metric: string; value: number; unit: string }> {
  const results: Array<{ date: string; metric: string; value: number; unit: string }> = [];
  const p = payload as Record<string, unknown>;

  // Terra daily activity payload
  if (eventType === "daily" || eventType === "activity") {
    const data = (p.data ?? p.daily ?? []) as Record<string, unknown>[];
    for (const day of data) {
      const date = String(day.date ?? day.calendar_date ?? "");
      if (!date) continue;

      const steps = getNestedNum(day, ["steps", "summary.steps", "active_durations_data.steps"]);
      if (steps > 0) results.push({ date, metric: "steps", value: steps, unit: "steps" });

      const cal = getNestedNum(day, ["calories_data.net_activity_calories", "calories_data.total_burned_calories"]);
      if (cal > 0) results.push({ date, metric: "caloriesActive", value: cal, unit: "kcal" });

      const dist = getNestedNum(day, ["distance_data.distance_meters"]);
      if (dist > 0) results.push({ date, metric: "distanceMeters", value: dist, unit: "meters" });

      const active = getNestedNum(day, ["active_durations_data.activity_seconds"]);
      if (active > 0) results.push({ date, metric: "activeMinutes", value: Math.round(active / 60), unit: "min" });
    }
  }

  // Terra sleep payload
  if (eventType === "sleep") {
    const data = (p.data ?? []) as Record<string, unknown>[];
    for (const s of data) {
      const date = String(s.date ?? s.calendar_date ?? "");
      if (!date) continue;

      const total = getNestedNum(s, ["sleep_durations_data.asleep.duration_asleep_state_seconds"]);
      if (total > 0) results.push({ date, metric: "sleepHours", value: total / 3600, unit: "hours" });

      const efficiency = getNestedNum(s, ["sleep_efficiency_data.sleep_efficiency_percentage", "sleep_efficiency_data.sleep_efficiency_factor"]);
      if (efficiency > 0) results.push({ date, metric: "sleepEfficiency", value: efficiency > 1 ? efficiency : efficiency * 100, unit: "%" });

      const deep = getNestedNum(s, ["sleep_durations_data.sleep_stages.total_deep_sleep_duration_seconds"]);
      if (deep > 0) results.push({ date, metric: "deepMin", value: Math.round(deep / 60), unit: "min" });

      const rem = getNestedNum(s, ["sleep_durations_data.sleep_stages.total_rem_sleep_duration_seconds"]);
      if (rem > 0) results.push({ date, metric: "remMin", value: Math.round(rem / 60), unit: "min" });
    }
  }

  // Terra body / measurements
  if (eventType === "body") {
    const data = (p.data ?? []) as Record<string, unknown>[];
    for (const b of data) {
      const date = String(b.date ?? b.calendar_date ?? "");
      if (!date) continue;

      const weight = getNestedNum(b, ["measurements_data.weight_kg", "weight_kg"]);
      if (weight > 0) results.push({ date, metric: "weightKg", value: weight, unit: "kg" });

      const fat = getNestedNum(b, ["measurements_data.body_fat_percentage", "body_fat_percentage"]);
      if (fat > 0) results.push({ date, metric: "bodyFatPct", value: fat, unit: "%" });
    }
  }

  // Terra scores / readiness
  if (eventType === "scores" || eventType === "readiness") {
    const data = (p.data ?? []) as Record<string, unknown>[];
    for (const d of data) {
      const date = String(d.date ?? d.calendar_date ?? "");
      if (!date) continue;

      const readiness = getNestedNum(d, ["readiness_data.readiness", "readiness_score"]);
      if (readiness > 0) results.push({ date, metric: "readinessScore", value: readiness, unit: "score" });

      const hrv = getNestedNum(d, ["heart_rate_data.resting_hrv_rmssd_millis", "heart_rate_data.resting_hrv_sdnn_millis", "hrv_ms"]);
      if (hrv > 0) results.push({ date, metric: "hrvMs", value: hrv, unit: "ms" });

      const rhr = getNestedNum(d, ["heart_rate_data.resting_hr_bpm", "resting_hr_bpm"]);
      if (rhr > 0) results.push({ date, metric: "restingHr", value: rhr, unit: "bpm" });
    }
  }

  return results;
}

function getNestedNum(obj: Record<string, unknown>, paths: string[]): number {
  for (const path of paths) {
    const keys = path.split(".");
    let cur: unknown = obj;
    for (const k of keys) {
      if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[k];
      else { cur = undefined; break; }
    }
    if (typeof cur === "number" && !isNaN(cur)) return cur;
  }
  return 0;
}
