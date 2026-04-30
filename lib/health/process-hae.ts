/**
 * Plain-async HAE pipeline.
 *
 * This is the same metric extraction + daily rollup that
 * `lib/jobs/health-ingest.ts` runs through Inngest, factored out into
 * pure prisma calls so the webhook handler can run it inline. Inngest
 * stays registered as a fallback; in practice we can't rely on it
 * because Railway production may not have the Inngest signing keys
 * configured, so events get sent but never delivered.
 *
 * Sequence per HaeRaw row:
 *   1. parseRawIntoMetrics — upsert HaeMetric per data point
 *   2. parseRawIntoWorkouts — upsert HaeWorkout per workout
 *   3. rollupDailyForDate — recompute HaeDaily for every date touched
 *   4. mark HaeRaw.processed = true
 *
 * Also exports `processHaeRawById(rawId)` for one-shot reprocessing
 * from the backlog script + the webhook.
 */

import { createHash } from "crypto";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { HAE_TO_VITA, inferSource, SOURCE_PRIORITY, pickBySourcePriority } from "@/lib/health/mapping";
import type { SourcePriority } from "@/lib/health/mapping";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const DEFAULT_TZ = "America/Toronto";

function parseHaeDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  try {
    const iso = raw.replace(
      /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/,
      "$1T$2$3$4:$5",
    );
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

function toLocalDateStr(utcDate: Date, timezone: string): string {
  const zoned = toZonedTime(utcDate, timezone);
  const y = zoned.getFullYear();
  const m = String(zoned.getMonth() + 1).padStart(2, "0");
  const d = String(zoned.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function localDateToUtcMidnight(localDateStr: string): Date {
  return new Date(localDateStr + "T00:00:00.000Z");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ingestMetrics(payload: any, userId: string, timezone: string, touched: Set<string>): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics: any[] = Array.isArray(payload?.data?.metrics) ? payload.data.metrics : [];
  let inserted = 0;
  for (const metric of metrics) {
    const mapping = HAE_TO_VITA[metric.name as string];
    if (!mapping) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataPoints: any[] = Array.isArray(metric.data) ? metric.data : [];
    for (const point of dataPoints) {
      const recordedAt = parseHaeDate(point.date ?? point.startDate ?? point.end);
      if (!recordedAt) continue;
      const rawValue = point.qty ?? point.value;
      const value = typeof rawValue === "number" ? rawValue : null;
      if (value === null) continue;
      const source = inferSource(point.sourceName ?? point.source);
      const localDate = toLocalDateStr(recordedAt, timezone);
      const dateObj = localDateToUtcMidnight(localDate);
      touched.add(localDate);
      await db.haeMetric.upsert({
        where: {
          userId_date_metricType_source_recordedAt: {
            userId, date: dateObj,
            metricType: mapping.metricType,
            source, recordedAt,
          },
        },
        create: { userId, date: dateObj, metricType: mapping.metricType, value, source, recordedAt },
        update: { value },
      });
      inserted++;
    }
  }
  return inserted;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ingestWorkouts(payload: any, userId: string, timezone: string, touched: Set<string>): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workouts: any[] = Array.isArray(payload?.data?.workouts) ? payload.data.workouts : [];
  let inserted = 0;
  for (const w of workouts) {
    const startedAt = parseHaeDate(w.start ?? w.startDate);
    const endedAt = parseHaeDate(w.end ?? w.endDate);
    if (!startedAt || !endedAt) continue;
    const workoutType = (w.workoutActivityType ?? w.name ?? "Unknown") as string;
    const source = inferSource(w.sourceName ?? w.source);
    const durationMin = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
    const hashInput = `${userId}|${startedAt.toISOString()}|${endedAt.toISOString()}|${workoutType}`;
    const externalHash = createHash("sha256").update(hashInput).digest("hex").slice(0, 32);
    const localDate = toLocalDateStr(startedAt, timezone);
    touched.add(localDate);
    await db.haeWorkout.upsert({
      where: { externalHash },
      create: {
        userId, startedAt, endedAt, durationMin, workoutType,
        energyKcal: typeof w.activeEnergyBurned === "number" ? w.activeEnergyBurned : null,
        avgHeartRate: typeof w.avgHeartRate === "number" ? Math.round(w.avgHeartRate) : null,
        maxHeartRate: typeof w.maxHeartRate === "number" ? Math.round(w.maxHeartRate) : null,
        distanceKm: typeof w.totalDistance === "number" ? w.totalDistance : null,
        source, externalHash,
      },
      update: {
        energyKcal: typeof w.activeEnergyBurned === "number" ? w.activeEnergyBurned : undefined,
      },
    });
    inserted++;
  }
  return inserted;
}

export async function rollupDailyForDate(userId: string, localDateStr: string): Promise<void> {
  const dateObj = localDateToUtcMidnight(localDateStr);
  const [metrics, workouts] = await Promise.all([
    db.haeMetric.findMany({ where: { userId, date: dateObj } }),
    db.haeWorkout.findMany({
      where: {
        userId,
        startedAt: { gte: dateObj, lt: new Date(dateObj.getTime() + 86400000) },
      },
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byType = new Map<string, Partial<Record<SourcePriority, number[]>>>();
  for (const m of metrics) {
    if (!byType.has(m.metricType)) byType.set(m.metricType, {});
    const entry = byType.get(m.metricType)!;
    const src = m.source as SourcePriority;
    if (!entry[src]) entry[src] = [];
    entry[src]!.push(m.value as number);
  }

  type Agg = "max" | "avg" | "sum";
  const aggregate = (vals: number[], agg: Agg): number =>
    agg === "max" ? Math.max(...vals)
    : agg === "avg" ? vals.reduce((a, b) => a + b, 0) / vals.length
    : vals.reduce((a, b) => a + b, 0);

  function getMetric(type: string, agg: Agg = "max"): number | null {
    const entry = byType.get(type);
    if (!entry) return null;
    const aggregated: Partial<Record<SourcePriority, number>> = {};
    for (const src of SOURCE_PRIORITY) {
      const vals = entry[src];
      if (vals?.length) aggregated[src] = aggregate(vals, agg);
    }
    return pickBySourcePriority(aggregated)?.value ?? null;
  }
  function getMetricWithSource(type: string, agg: Agg = "max") {
    const entry = byType.get(type);
    if (!entry) return null;
    const aggregated: Partial<Record<SourcePriority, number>> = {};
    for (const src of SOURCE_PRIORITY) {
      const vals = entry[src];
      if (vals?.length) aggregated[src] = aggregate(vals, agg);
    }
    return pickBySourcePriority(aggregated);
  }

  const stepsResult = getMetricWithSource("steps", "max");
  const hrvMs = getMetric("hrv_ms", "avg");
  const heartRateResting = getMetric("heart_rate_resting", "avg");
  const sleepHours = getMetric("sleep_hours", "max");
  const heartRateAvgRaw = getMetric("heart_rate_avg", "avg");

  let readinessScore: number | null = null;
  if (hrvMs !== null || sleepHours !== null || heartRateResting !== null) {
    let score = 50;
    if (hrvMs !== null) score += hrvMs > 60 ? 15 : hrvMs > 40 ? 7 : 0;
    if (sleepHours !== null) {
      if (sleepHours >= 7) score += 10;
      else if (sleepHours < 6) score -= 10;
    }
    if (heartRateResting !== null && heartRateResting > 70) score -= 5;
    readinessScore = Math.max(0, Math.min(100, Math.round(score)));
  }

  const totalWorkoutMinutes = workouts.reduce(
    (s: number, w: { durationMin: number }) => s + w.durationMin, 0,
  );
  const exerciseMins = getMetric("exercise_minutes", "max");
  const standHrs = getMetric("stand_hours", "max");
  const flights = getMetric("flights_climbed", "max");

  const row = {
    steps: stepsResult ? Math.round(stepsResult.value) : null,
    stepsSource: stepsResult?.source ?? null,
    activeEnergyKj: getMetric("active_energy_kj", "max"),
    restingEnergyKj: getMetric("resting_energy_kj", "max"),
    heartRateAvg: heartRateAvgRaw !== null ? Math.round(heartRateAvgRaw) : null,
    heartRateResting: heartRateResting !== null ? Math.round(heartRateResting) : null,
    hrvMs,
    sleepHours,
    workoutMinutes: totalWorkoutMinutes || null,
    workoutCount: workouts.length,
    exerciseMinutes: exerciseMins !== null ? Math.round(exerciseMins) : null,
    distanceKm: getMetric("distance_km", "max"),
    standHours: standHrs !== null ? Math.round(standHrs) : null,
    flightsClimbed: flights !== null ? Math.round(flights) : null,
    readinessScore,
  };

  await db.haeDaily.upsert({
    where: { userId_date: { userId, date: dateObj } },
    create: { userId, date: dateObj, ...row },
    update: Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null)),
  });

  // Bridge HaeDaily -> HealthDaily (row-per-metric, what the /today UI reads
  // from via /api/health/today and /api/health/trend). Without this bridge,
  // HaeRaw -> HaeMetric -> HaeDaily lands fine but the user's step counter
  // on /today stays empty.
  type HealthRow = { metric: string; value: number; unit: string; source: string };
  const writes: HealthRow[] = [];
  if (row.steps !== null)            writes.push({ metric: "steps",          value: row.steps,            unit: "count", source: row.stepsSource ?? "apple_health" });
  if (row.sleepHours !== null)       writes.push({ metric: "sleepHours",     value: row.sleepHours,       unit: "hours", source: "apple_health" });
  if (row.hrvMs !== null)            writes.push({ metric: "hrvMs",          value: row.hrvMs,            unit: "ms",    source: "apple_health" });
  if (row.heartRateResting !== null) writes.push({ metric: "restingHr",      value: row.heartRateResting, unit: "bpm",   source: "apple_health" });
  if (row.heartRateAvg !== null)     writes.push({ metric: "heartRateAvg",   value: row.heartRateAvg,     unit: "bpm",   source: "apple_health" });
  if (row.activeEnergyKj !== null)   writes.push({ metric: "caloriesActive", value: row.activeEnergyKj * 0.239, unit: "kcal", source: "apple_health" });
  if (row.exerciseMinutes !== null)  writes.push({ metric: "activeMinutes",  value: row.exerciseMinutes,  unit: "min",   source: "apple_health" });
  if (row.distanceKm !== null)       writes.push({ metric: "distanceKm",     value: row.distanceKm,       unit: "km",    source: "apple_health" });
  if (row.flightsClimbed !== null)   writes.push({ metric: "flightsClimbed", value: row.flightsClimbed,   unit: "count", source: "apple_health" });
  if (row.standHours !== null)       writes.push({ metric: "standHours",     value: row.standHours,       unit: "hours", source: "apple_health" });
  if (row.workoutMinutes !== null)   writes.push({ metric: "workoutMinutes", value: row.workoutMinutes,   unit: "min",   source: "apple_health" });
  if (row.readinessScore !== null)   writes.push({ metric: "readinessScore", value: row.readinessScore,   unit: "score", source: "apple_health" });

  for (const w of writes) {
    await prisma.healthDaily.upsert({
      where: { userId_date_metric: { userId, date: dateObj, metric: w.metric } },
      create: {
        userId, date: dateObj, metric: w.metric,
        value: w.value, unit: w.unit, source: w.source,
        sources: { [w.source]: w.value } as object,
        trust: 0.9, overridden: false,
      },
      update: {
        value: w.value, unit: w.unit, source: w.source,
        sources: { [w.source]: w.value } as object,
        trust: 0.9,
        computedAt: new Date(),
      },
    });
  }
}

/**
 * Process one HaeRaw row end-to-end. Marks `processed=true` on success,
 * fills `error` and leaves `processed=false` on failure so the next
 * inbound payload + the backfill script can retry.
 */
export async function processHaeRawById(rawId: string): Promise<{ metricsInserted: number; workoutsInserted: number; datesRolled: number }> {
  const raw = await db.haeRaw.findUnique({ where: { id: rawId } });
  if (!raw) throw new Error(`HaeRaw ${rawId} not found`);

  const user = await prisma.user.findUnique({
    where: { id: raw.userId },
    select: { timezone: true },
  });
  const timezone = user?.timezone || DEFAULT_TZ;

  const touched = new Set<string>();

  try {
    const m = await ingestMetrics(raw.payload, raw.userId, timezone, touched);
    const w = await ingestWorkouts(raw.payload, raw.userId, timezone, touched);
    for (const dateStr of touched) {
      await rollupDailyForDate(raw.userId, dateStr);
    }
    await db.haeRaw.update({
      where: { id: rawId },
      data: { processed: true, processedAt: new Date(), error: null },
    });
    return { metricsInserted: m, workoutsInserted: w, datesRolled: touched.size };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.haeRaw.update({
      where: { id: rawId },
      data: { error: msg.slice(0, 500) },
    });
    throw e;
  }
}
