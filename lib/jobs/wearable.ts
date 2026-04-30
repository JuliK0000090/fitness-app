/**
 * Wearable-driven habit jobs (Phase 3 of the dashboard rebuild).
 *
 *   resolveWearableHabits     — every 15 min. Between 23:55 and 00:30
 *     user-local, writes a HabitCompletion DONE/MISSED for each
 *     wearable habit due today. Idempotent — running twice produces
 *     the same row.
 *
 *   lateDayWearableNudge      — every 10 min. Between 22:00 and 23:30
 *     user-local, sends one push if the user is within 5–25% of a
 *     GTE-style wearable target. Throttled to one push per user per
 *     day.
 *
 * Both jobs scan all users on every fire and skip those outside the
 * relevant local-time window. Cheaper and simpler than per-user crons.
 */

import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { send } from "@/lib/notifications/send";
import { userToday, userLocalHour, userTodayStr } from "@/lib/time/today";
import { resolveWearableHabit } from "@/lib/habits/wearable-resolution";

// ── 1. End-of-day resolution ─────────────────────────────────────────────────

const RESOLUTION_START_HOUR = 23;
const RESOLUTION_END_HOUR = 0; // exclusive — fires through 00:30 next day

export const resolveWearableHabits = inngest.createFunction(
  {
    id: "wearable-resolve-habits",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("scan-and-resolve", async () => {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true, timezone: true },
      });

      let resolved = 0;
      let dueWritten = 0;

      for (const u of users) {
        const tz = u.timezone ?? "UTC";
        if (!isInResolutionWindow(tz)) continue;

        const integration = await prisma.healthIntegration.findUnique({
          where: { userId: u.id },
          select: { active: true },
        });
        if (!integration?.active) continue;

        const today = userToday(tz);
        const habits = await prisma.habit.findMany({
          where: {
            userId: u.id,
            active: true,
            trackingMode: { in: ["WEARABLE_AUTO", "HYBRID"] },
          },
          select: {
            id: true, cadence: true, specificDays: true,
            metricKey: true, metricTarget: true, metricComparison: true,
            pointsOnComplete: true, trackingMode: true,
          },
        });
        if (habits.length === 0) continue;

        for (const h of habits) {
          if (!isHabitDueToday(h.cadence, h.specificDays, tz)) continue;

          // HYBRID: skip if the user already manually completed.
          if (h.trackingMode === "HYBRID") {
            const existing = await prisma.habitCompletion.findUnique({
              where: { habitId_date: { habitId: h.id, date: today } },
            });
            if (existing && existing.source === "MANUAL") continue;
          }

          const r = await resolveWearableHabit(h.id, today);
          if (!r.resolved) continue; // no HealthDaily yet — try again next 15 min

          // Idempotent upsert. If a prior run already wrote a row, leave
          // it alone unless we now know more (DONE replacing MISSED, e.g.
          // late-night step accumulation).
          const existing = await prisma.habitCompletion.findUnique({
            where: { habitId_date: { habitId: h.id, date: today } },
          });

          if (!existing) {
            await prisma.habitCompletion.create({
              data: {
                habitId: h.id,
                userId: u.id,
                date: today,
                status: r.status,
                source: "WEARABLE_AUTO",
                completedAt: r.status === "DONE" ? new Date() : null,
                points: r.status === "DONE" ? h.pointsOnComplete : 0,
              },
            });
            if (r.status === "DONE") {
              await prisma.user.update({
                where: { id: u.id },
                data: { totalXp: { increment: h.pointsOnComplete } },
              });
            }
            dueWritten++;
          } else if (existing.source === "WEARABLE_AUTO" && existing.status !== r.status) {
            // Upgrade MISSED → DONE if the user crossed the line late.
            if (existing.status === "MISSED" && r.status === "DONE") {
              await prisma.habitCompletion.update({
                where: { habitId_date: { habitId: h.id, date: today } },
                data: {
                  status: "DONE",
                  completedAt: new Date(),
                  points: h.pointsOnComplete,
                },
              });
              await prisma.user.update({
                where: { id: u.id },
                data: { totalXp: { increment: h.pointsOnComplete } },
              });
            }
          }
          resolved++;
        }
      }

      return { resolved, dueWritten };
    });

    return result;
  },
);

// ── 2. Late-day "you're close" nudge ─────────────────────────────────────────

const LATE_DAY_START_HOUR = 22;
const LATE_DAY_END_HOUR = 23;        // 22:00–23:59 local
const NUDGE_GAP_MIN_PCT = 5;
const NUDGE_GAP_MAX_PCT = 25;

export const lateDayWearableNudge = inngest.createFunction(
  {
    id: "wearable-late-day-nudge",
    triggers: [{ cron: "*/10 * * * *" }],
  },
  async ({ step }) => {
    const fired = await step.run("scan-and-nudge", async () => {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true, timezone: true },
      });

      let count = 0;
      for (const u of users) {
        const tz = u.timezone ?? "UTC";
        const hour = userLocalHour(tz);
        if (hour < LATE_DAY_START_HOUR || hour > LATE_DAY_END_HOUR) continue;

        const integration = await prisma.healthIntegration.findUnique({
          where: { userId: u.id },
          select: { active: true },
        });
        if (!integration?.active) continue;

        const prefs = await prisma.notificationPreference.findUnique({
          where: { userId: u.id },
          select: { lateDayNudge: true },
        });
        if (prefs && !prefs.lateDayNudge) continue;

        // Throttle: at most one late-day nudge per user per day.
        const todayStr = userTodayStr(tz);
        const todayLocalMidnight = new Date(`${todayStr}T00:00:00.000Z`);
        const alreadySent = await prisma.notificationLog.findFirst({
          where: {
            userId: u.id,
            category: "lateDayNudge",
            sentAt: { gte: todayLocalMidnight },
          },
          select: { id: true },
        });
        if (alreadySent) continue;

        // Find a candidate habit: GTE wearable habit close to target.
        const today = userToday(tz);
        const habits = await prisma.habit.findMany({
          where: {
            userId: u.id,
            active: true,
            trackingMode: { in: ["WEARABLE_AUTO", "HYBRID"] },
            metricComparison: "GTE",
            // Only actionable categories — no point pinging about HRV.
            metricKey: { in: ["steps", "activeMinutes"] },
          },
          select: {
            id: true, title: true, metricKey: true, metricTarget: true,
            cadence: true, specificDays: true,
          },
        });
        if (habits.length === 0) continue;

        let firedForThisUser = false;
        for (const h of habits) {
          if (firedForThisUser) break;
          if (!h.metricKey || h.metricTarget == null) continue;
          if (!isHabitDueToday(h.cadence, h.specificDays, tz)) continue;

          const daily = await prisma.healthDaily.findUnique({
            where: {
              userId_date_metric: {
                userId: u.id, date: today, metric: h.metricKey,
              },
            },
            select: { value: true },
          });
          if (!daily) continue;

          const value = daily.value;
          const target = h.metricTarget;
          if (value >= target) continue; // already done — no nudge needed
          const gap = target - value;
          const gapPct = (gap / target) * 100;
          if (gapPct < NUDGE_GAP_MIN_PCT || gapPct > NUDGE_GAP_MAX_PCT) continue;

          const { title, body } = nudgeCopy(h.metricKey, gap, target);
          await send({
            userId: u.id,
            category: "lateDayNudge",
            title,
            body,
            deepLink: "/today",
            essential: true, // bypass quiet hours — user opted in to this category
          });
          count++;
          firedForThisUser = true;
        }
      }
      return count;
    });
    return { fired };
  },
);

export const wearableJobFunctions = [resolveWearableHabits, lateDayWearableNudge];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** True when local time is in [23:55, 00:30). */
function isInResolutionWindow(tz: string): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  if (h === RESOLUTION_START_HOUR && m >= 55) return true;
  if (h === RESOLUTION_END_HOUR && m < 30) return true;
  return false;
}

function isHabitDueToday(cadence: string, specificDays: number[], tz: string): boolean {
  const localDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  const dow = new Date(localDateStr + "T12:00:00Z").getUTCDay();
  switch (cadence.toLowerCase()) {
    case "daily": return true;
    case "weekdays": return dow >= 1 && dow <= 5;
    case "weekends": return dow === 0 || dow === 6;
    case "specific_days": return specificDays.includes(dow);
    default: return true;
  }
}

function nudgeCopy(metricKey: string, gap: number, target: number): { title: string; body: string } {
  if (metricKey === "steps") {
    const minutes = Math.max(1, Math.round(gap / 100));
    return {
      title: "Almost there",
      body: `${Math.round(gap).toLocaleString()} steps to ${target.toLocaleString()}. A ${minutes}-minute walk would do it.`,
    };
  }
  if (metricKey === "activeMinutes") {
    return {
      title: "Almost there",
      body: `${Math.round(gap)} minutes left to your ${target}. A song's worth of brisk walking.`,
    };
  }
  return {
    title: "Almost there",
    body: `${Math.round(gap)} to your goal of ${target}.`,
  };
}
