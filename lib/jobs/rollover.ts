/**
 * Per-user-timezone rollover. Runs hourly UTC; for each user whose local time
 * is currently 00:00 we sweep yesterday's PLANNED rows. Each PLANNED workout
 * resolves to MISSED, unless an active PlannerConstraint blocked it — then
 * AUTO_SKIPPED with the constraint's reason captured in skippedReason.
 *
 * A second hourly pass at user-local 21:00 emits a "reality check" suggestion
 * for any PLANNED workout today whose scheduled time already passed by >1h.
 */

import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { userLocalHour, userYesterday, userTodayStr } from "@/lib/time/today";
import { findBlockingConstraint } from "@/lib/coach/constraints";
import { markMissedHabits } from "@/lib/habits/complete";
import { regenerateUserPlan } from "@/lib/coach/regenerate";

// ── End-of-day rollover (runs every hour, only acts at user-local 00:00) ─────
export const rolloverScheduledWorkouts = inngest.createFunction(
  {
    id: "rollover-scheduled-workouts",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true, timezone: true, lastRolloverDate: true },
      });
    });

    let usersProcessed = 0;
    let workoutsResolved = 0;
    let habitsMarkedMissed = 0;

    for (const user of users) {
      const tz = user.timezone || "UTC";
      const hour = userLocalHour(tz);
      // Run at local midnight (hour 0) — also be lenient by 1h for cron drift
      if (hour !== 0) continue;

      const todayStr = userTodayStr(tz);
      // Idempotency — only run once per user-local-day. Inngest step.run
      // serialises results to JSON, so lastRolloverDate may come back as a
      // string here.
      const lastRolloverIso = user.lastRolloverDate
        ? new Date(user.lastRolloverDate as Date | string).toISOString().split("T")[0]
        : null;
      if (lastRolloverIso === todayStr) {
        continue;
      }

      await step.run(`rollover-${user.id}`, async () => {
        const yesterday = userYesterday(tz);

        const stale = await prisma.scheduledWorkout.findMany({
          where: {
            userId: user.id,
            scheduledDate: yesterday,
            status: "PLANNED",
          },
        });

        if (stale.length > 0) {
          const constraints = await prisma.plannerConstraint.findMany({
            where: { userId: user.id, active: true },
          });

          for (const sw of stale) {
            const blocker = findBlockingConstraint(sw, constraints);
            if (blocker) {
              await prisma.scheduledWorkout.update({
                where: { id: sw.id },
                data: { status: "AUTO_SKIPPED", skippedReason: blocker.reason },
              });
            } else {
              await prisma.scheduledWorkout.update({
                where: { id: sw.id },
                data: { status: "MISSED" },
              });
            }
          }
          workoutsResolved += stale.length;
        }

        // Roll over yesterday's habits in the same pass.
        const missedCount = await markMissedHabits(user.id, yesterday);
        habitsMarkedMissed += missedCount;

        // Mark this user as rolled over for the day.
        await prisma.user.update({
          where: { id: user.id },
          data: { lastRolloverDate: new Date(todayStr + "T00:00:00.000Z") },
        });
      });

      usersProcessed++;
    }

    return { usersProcessed, workoutsResolved, habitsMarkedMissed };
  },
);

// ── Late-day reality check (runs every hour, only acts at user-local 21:00) ──
export const lateDayBlockCheck = inngest.createFunction(
  {
    id: "late-day-block-check",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true, timezone: true },
      });
    });

    let suggestionsCreated = 0;

    for (const user of users) {
      const tz = user.timezone || "UTC";
      if (userLocalHour(tz) !== 21) continue;

      await step.run(`late-day-${user.id}`, async () => {
        const todayStr = userTodayStr(tz);
        const today = new Date(todayStr + "T00:00:00.000Z");

        const planned = await prisma.scheduledWorkout.findMany({
          where: {
            userId: user.id,
            scheduledDate: today,
            status: "PLANNED",
          },
        });
        if (planned.length === 0) return;

        // For each PLANNED workout whose scheduled time has passed by >1h,
        // and where we haven't already flagged it today, create a suggestion.
        const nowMinutesLocal = 21 * 60;
        const overdue = planned.filter((sw) => {
          if (!sw.scheduledTime) return true; // no time = end-of-day-soft
          const [h, m] = sw.scheduledTime.split(":").map(Number);
          const startMin = h * 60 + (m || 0);
          const endMin = startMin + (sw.duration ?? 45);
          return endMin + 60 <= nowMinutesLocal; // ended >1h ago
        });
        if (overdue.length === 0) return;

        // De-dupe — one suggestion per workout per day
        const todayMidnight = new Date(todayStr + "T00:00:00.000Z");
        const existing = await prisma.chatSuggestion.findMany({
          where: {
            userId: user.id,
            type: "LATE_DAY_REALITY_CHECK",
            createdAt: { gte: todayMidnight },
          },
          select: { payload: true },
        });
        const alreadyFlagged = new Set<string>();
        for (const e of existing) {
          const p = e.payload as Record<string, unknown> | null;
          const id = p && typeof p.workoutId === "string" ? p.workoutId : null;
          if (id) alreadyFlagged.add(id);
        }

        for (const sw of overdue) {
          if (alreadyFlagged.has(sw.id)) continue;
          await prisma.chatSuggestion.create({
            data: {
              userId: user.id,
              type: "LATE_DAY_REALITY_CHECK",
              title: `${sw.workoutTypeName ?? "Workout"} didn't happen`,
              body: sw.scheduledTime
                ? `${sw.workoutTypeName ?? "Workout"} at ${sw.scheduledTime} hasn't been logged. Move to tomorrow, or skip?`
                : `${sw.workoutTypeName ?? "Workout"} hasn't been logged today. Move to tomorrow, or skip?`,
              payload: {
                workoutId: sw.id,
                workoutTypeName: sw.workoutTypeName,
                scheduledTime: sw.scheduledTime,
              } as object,
            },
          });
          suggestionsCreated++;
        }
      });
    }

    return { suggestionsCreated };
  },
);

// ── Daily 02:00 user-local — refresh the 8-week rolling plan horizon ─────────
// Runs every hour, only acts when the user's local hour is 02. Idempotent so
// re-firing across timezone overlaps doesn't duplicate. Skips users with no
// active WeeklyTargets.
export const regeneratePlanRolling = inngest.createFunction(
  {
    id: "regenerate-plan-rolling",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const users = await step.run("fetch-users-with-targets", async () => {
      return prisma.user.findMany({
        where: {
          deletedAt: null,
          onboardingComplete: true,
          weeklyTargets: { some: { active: true } },
        },
        select: { id: true, timezone: true },
      });
    });

    let regenerated = 0;
    let totalCreated = 0;
    let totalDeleted = 0;

    for (const user of users) {
      const tz = user.timezone || "UTC";
      if (userLocalHour(tz) !== 2) continue;

      const result = await step.run(`regen-${user.id}`, async () => {
        return regenerateUserPlan(user.id);
      });
      regenerated++;
      totalCreated += result.workoutsCreated;
      totalDeleted += result.workoutsDeleted;
    }

    return { regenerated, totalCreated, totalDeleted };
  },
);

export const rolloverFunctions = [
  rolloverScheduledWorkouts,
  lateDayBlockCheck,
  regeneratePlanRolling,
];
