import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { HAE_TO_VITA, inferSource, SOURCE_PRIORITY, pickBySourcePriority } from "@/lib/health/mapping";
import type { SourcePriority } from "@/lib/health/mapping";
import { toZonedTime } from "date-fns-tz";
import { createHash } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const DEFAULT_TZ = "America/Toronto";

function parseHaeDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  try {
    // HAE format: "2026-04-24 06:30:00 -0400"
    const iso = raw.replace(
      /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/,
      "$1T$2$3$4:$5"
    );
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
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

// ── Process raw HAE payload ────────────────────────────────────────────────────

export const processRawPayload = inngest.createFunction(
  { id: "health-hae-process-raw", retries: 3, triggers: [{ event: "health/hae.raw.received" }] },
  async ({ event, step }: { event: { data: { rawId: string; userId: string } }; step: any }) => {
    const { rawId, userId } = event.data;

    const { raw, timezone } = await step.run("load-raw-and-user", async () => {
      const [rawRow, user] = await Promise.all([
        db.haeRaw.findUnique({ where: { id: rawId } }),
        prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
      ]);
      return { raw: rawRow, timezone: (user?.timezone as string | null) ?? DEFAULT_TZ };
    });

    if (!raw) throw new Error(`HaeRaw ${rawId} not found`);

    const touchedDates = new Set<string>();

    await step.run("ingest-metrics", async () => {
      const payload = raw.payload as any;
      const metrics: any[] = Array.isArray(payload?.data?.metrics) ? payload.data.metrics : [];
      let inserted = 0;

      for (const metric of metrics) {
        const mapping = HAE_TO_VITA[metric.name as string];
        if (!mapping) continue;

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
          touchedDates.add(localDate);

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
      console.info(`[HAE] user=${userId} metrics inserted/updated: ${inserted}`);
      return inserted;
    });

    await step.run("ingest-workouts", async () => {
      const payload = raw.payload as any;
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
        touchedDates.add(localDate);

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
      console.info(`[HAE] user=${userId} workouts inserted/updated: ${inserted}`);
      return inserted;
    });

    await step.run("mark-processed", async () => {
      await db.haeRaw.update({
        where: { id: rawId },
        data: { processed: true, processedAt: new Date() },
      });
    });

    if (touchedDates.size > 0) {
      await step.run("fan-out-dates", async () => {
        await inngest.send(
          [...touchedDates].map((date) => ({
            name: "health/hae.date.changed",
            data: { userId, date },
          }))
        );
      });
    }
  }
);

// ── Roll up HaeDaily from HaeMetrics ─────────────────────────────────────────

export const rollupHealthDaily = inngest.createFunction(
  { id: "health-hae-rollup-daily", retries: 3, triggers: [{ event: "health/hae.date.changed" }] },
  async ({ event, step }: { event: { data: { userId: string; date: string } }; step: any }) => {
    const { userId, date } = event.data;
    const dateObj = localDateToUtcMidnight(date);

    const { metrics, workouts } = await step.run("load-data", async () => {
      const [metrics, workouts] = await Promise.all([
        db.haeMetric.findMany({ where: { userId, date: dateObj } }),
        db.haeWorkout.findMany({
          where: {
            userId,
            startedAt: { gte: dateObj, lt: new Date(dateObj.getTime() + 86400000) },
          },
        }),
      ]);
      return { metrics, workouts };
    });

    await step.run("upsert-daily", async () => {
      // Group metrics by type → per-source arrays
      const byType = new Map<string, Partial<Record<SourcePriority, number[]>>>();
      for (const m of metrics as any[]) {
        if (!byType.has(m.metricType)) byType.set(m.metricType, {});
        const entry = byType.get(m.metricType)!;
        const src = m.source as SourcePriority;
        if (!entry[src]) entry[src] = [];
        entry[src]!.push(m.value as number);
      }

      type Agg = "max" | "avg" | "sum";
      function aggregate(vals: number[], agg: Agg): number {
        if (agg === "max") return Math.max(...vals);
        if (agg === "avg") return vals.reduce((a, b) => a + b, 0) / vals.length;
        return vals.reduce((a, b) => a + b, 0);
      }

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

      const totalWorkoutMinutes = (workouts as any[]).reduce((s, w) => s + w.durationMin, 0);

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
        workoutCount: (workouts as any[]).length,
        exerciseMinutes: getMetric("exercise_minutes", "max") !== null ? Math.round(getMetric("exercise_minutes", "max")!) : null,
        distanceKm: getMetric("distance_km", "max"),
        standHours: getMetric("stand_hours", "max") !== null ? Math.round(getMetric("stand_hours", "max")!) : null,
        flightsClimbed: getMetric("flights_climbed", "max") !== null ? Math.round(getMetric("flights_climbed", "max")!) : null,
        readinessScore,
      };

      await db.haeDaily.upsert({
        where: { userId_date: { userId, date: dateObj } },
        create: { userId, date: dateObj, ...row },
        update: Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null)),
      });

      console.info(`[HAE] daily rolled up user=${userId} date=${date} readiness=${readinessScore}`);
    });

    await step.run("emit-daily-updated", async () => {
      await inngest.send({ name: "health/hae.daily.updated", data: { userId, date } });
    });
  }
);

// ── Auto-complete scheduled workouts from Apple Health ────────────────────────

export const autoCompleteBlocksFromHealth = inngest.createFunction(
  { id: "health-hae-auto-complete-blocks", retries: 2, triggers: [{ event: "health/hae.daily.updated" }] },
  async ({ event, step }: { event: { data: { userId: string; date: string } }; step: any }) => {
    const { userId, date } = event.data;
    const dateObj = localDateToUtcMidnight(date);

    await step.run("match-workouts-to-blocks", async () => {
      const workouts = await db.haeWorkout.findMany({
        where: {
          userId,
          startedAt: { gte: dateObj, lt: new Date(dateObj.getTime() + 86400000) },
          autoMatchedBlockId: null,
        },
      });

      for (const workout of workouts as any[]) {
        const matchingSw = await prisma.scheduledWorkout.findFirst({
          where: {
            userId,
            scheduledDate: dateObj,
            status: "PLANNED",
            workoutTypeName: { contains: workout.workoutType, mode: "insensitive" },
          },
        });

        if (matchingSw) {
          await Promise.all([
            prisma.scheduledWorkout.update({
              where: { id: matchingSw.id },
              data: { status: "DONE", completedAt: workout.endedAt, pointsEarned: 50 },
            }),
            db.haeWorkout.update({
              where: { id: workout.id },
              data: { autoMatchedBlockId: matchingSw.id },
            }),
            prisma.user.update({
              where: { id: userId },
              data: { totalXp: { increment: 50 } },
            }),
          ]);
          console.info(`[HAE] auto-completed sw=${matchingSw.id} from haeWorkout=${workout.id}`);
        }
      }
    });
  }
);

// ── Cleanup raw payloads older than 30 days ───────────────────────────────────

export const cleanupOldRawPayloads = inngest.createFunction(
  { id: "health-hae-cleanup-raw", triggers: [{ cron: "0 3 * * *" }] },
  async ({ step }: { step: any }) => {
    await step.run("delete-old-raw", async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const result = await db.haeRaw.deleteMany({ where: { receivedAt: { lt: cutoff } } });
      console.info(`[HAE cleanup] deleted ${result.count} raw payloads`);
      return result.count;
    });
  }
);

export const healthIngestFunctions = [
  processRawPayload,
  rollupHealthDaily,
  autoCompleteBlocksFromHealth,
  cleanupOldRawPayloads,
];
