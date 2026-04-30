/**
 * Tile caption helpers.
 *
 * These produce the small one-line caption beneath each SignalTile.
 *
 * - Closing-the-gap (steps, active minutes): pace estimator. We know
 *   today's value and the target, and roughly what time of day it is —
 *   "on pace" if you're at >= expected fraction of target.
 * - Steady-state (sleep, HRV, RHR): vs-baseline delta in plain language.
 *
 * Voice: short, observational, no exclamation, no emoji.
 */

const ACTIVE_DAY_END_HOUR = 17;

/**
 * For GTE step-style metrics: "Goal 10,000 · 1,200 to go · on pace" or
 * "Goal 10,000 · 1,200 to go · 12 min walk would do it".
 * Returns "Goal hit · 10,432 steps" once met.
 */
export function paceCaption(
  current: number,
  target: number,
  now: Date,
  unit: "steps" | "min" = "steps",
): string {
  const targetText = unit === "steps" ? target.toLocaleString() : `${target} ${unit}`;
  if (current >= target) {
    const currentText = unit === "steps" ? `${Math.round(current).toLocaleString()} steps` : `${Math.round(current)} ${unit}`;
    return `Goal hit · ${currentText}`;
  }
  const remaining = Math.max(0, Math.round(target - current));
  const remainingText = unit === "steps" ? remaining.toLocaleString() : `${remaining} ${unit}`;

  const localHourFrac = now.getHours() + now.getMinutes() / 60;
  const fractionOfDayElapsed = Math.min(localHourFrac / ACTIVE_DAY_END_HOUR, 1);
  const onPace = fractionOfDayElapsed > 0 && (current / target) >= fractionOfDayElapsed;

  if (onPace) {
    return `Goal ${targetText} · ${remainingText} to go · on pace`;
  }
  if (unit === "steps") {
    const minutesNeeded = Math.max(1, Math.round(remaining / 100)); // ~100 steps/min walking
    return `Goal ${targetText} · ${remainingText} to go · ${minutesNeeded} min walk would do it`;
  }
  return `Goal ${targetText} · ${remainingText} to go`;
}

/** "+18 min vs your 7-day avg" / "−12 min vs your 7-day avg" / "" if no baseline. */
export function sleepDeltaCaption(value: number, baseline: number | null): string {
  if (baseline === null || !Number.isFinite(baseline)) return "";
  const deltaMins = Math.round((value - baseline) * 60);
  if (deltaMins === 0) return "Right on your 7-day average";
  const sign = deltaMins > 0 ? "+" : "−";
  return `${sign}${Math.abs(deltaMins)} min vs your 7-day avg`;
}

/** "+9% vs baseline · recovered" / "−8% vs baseline · still tired" / "". */
export function hrvDeltaCaption(value: number, baseline: number | null): string {
  if (baseline === null || !Number.isFinite(baseline) || baseline === 0) return "";
  const pct = Math.round(((value - baseline) / baseline) * 100);
  if (pct === 0) return "On your baseline";
  const sign = pct > 0 ? "+" : "−";
  const tag = pct >= 5 ? " · recovered" : pct <= -5 ? " · still tired" : "";
  return `${sign}${Math.abs(pct)}% vs baseline${tag}`;
}

/** "−2 vs your typical · settled" / "+4 vs your typical · elevated" / "". */
export function rhrDeltaCaption(value: number, baseline: number | null): string {
  if (baseline === null || !Number.isFinite(baseline)) return "";
  const delta = Math.round(value - baseline);
  if (delta === 0) return "Right at your typical";
  const sign = delta > 0 ? "+" : "−";
  const tag = delta <= -2 ? " · settled" : delta >= 3 ? " · elevated" : "";
  return `${sign}${Math.abs(delta)} vs your typical${tag}`;
}

/** Format hours-as-decimal as "Xh Ym". 7.25 → "7h 15m". */
export function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 60) return `${h + 1}h 0m`;
  return `${h}h ${m}m`;
}
