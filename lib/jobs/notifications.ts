/**
 * Inngest schedulers for the four push-notification categories from
 * Track A. Each one funnels through lib/notifications/send.ts which
 * enforces preferences, quiet hours, and the 2-per-24h restraint cap.
 *
 *   preWorkoutNudge        — every 5 min; finds workouts starting in 30 min
 *   streakSaveNudge        — hourly; fires at user-local 20:00 if habits
 *                            are still incomplete and the user has been
 *                            on a streak in the last 7 days
 *   weeklyReviewNudge      — hourly; fires at user-local 19:00 on Sunday
 *   reactiveAdjustmentSent — manual entry point used by the planner
 *                            when a constraint moves a block
 *
 * Voice and copy stay restrained: short, factual, no emoji, signed
 * "— Vita" only on emails (push titles stay terse).
 */

import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { send } from "@/lib/notifications/send";
import { userLocalHour, userTodayStr } from "@/lib/time/today";

// ── 1. Pre-workout nudge: every 5 minutes ────────────────────────────────────
export const preWorkoutNudge = inngest.createFunction(
  {
    id: "notif-pre-workout",
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async ({ step }) => {
    const fired = await step.run("scan-and-send", async () => {
      // Find every PLANNED workout today (server-tz match) where the
      // scheduled time falls 25–35 minutes from now in the user's tz.
      // We over-select on date and filter time-of-day in JS so we don't
      // miss timezone edges.
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 2);
      const candidates = await prisma.scheduledWorkout.findMany({
        where: {
          status: "PLANNED",
          scheduledDate: { gte: today, lt: tomorrow },
          scheduledTime: { not: null },
        },
        include: { user: { select: { id: true, timezone: true } } },
      });

      let count = 0;
      for (const sw of candidates) {
        const tz = sw.user.timezone ?? "UTC";
        const localHourNow = userLocalHour(tz);
        const localTodayStr = userTodayStr(tz);
        if (sw.scheduledDate.toISOString().split("T")[0] !== localTodayStr) continue;

        // Compute minutes-until-start in user-local time.
        const [h, m] = (sw.scheduledTime ?? "00:00").split(":").map(Number);
        const startMin = h * 60 + (m || 0);
        const localTimeNow = new Intl.DateTimeFormat("en-US", {
          timeZone: tz, hour: "numeric", minute: "numeric", hour12: false,
        }).formatToParts(new Date());
        const nowH = parseInt(localTimeNow.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
        const nowM = parseInt(localTimeNow.find((p) => p.type === "minute")?.value ?? "0", 10);
        const nowMin = nowH * 60 + nowM;
        const delta = startMin - nowMin;
        if (delta < 25 || delta > 35) continue;

        // De-dupe: if we've already sent a preWorkout for this row, skip.
        const since = new Date(Date.now() - 90 * 60 * 1000);
        const already = await prisma.notificationLog.findFirst({
          where: {
            userId: sw.userId,
            category: "preWorkout",
            sentAt: { gte: since },
            deepLink: { contains: sw.id },
          },
        });
        if (already) continue;

        await send({
          userId: sw.userId,
          category: "preWorkout",
          title: sw.workoutTypeName ?? "Workout",
          body: `${sw.scheduledTime} — ready when you are.`,
          deepLink: `/today?w=${sw.id}`,
        });
        count++;
        void localHourNow;
      }
      return count;
    });

    return { fired };
  },
);

// ── 2. Streak-save nudge: hourly, fires at user-local 20:00 ──────────────────
export const streakSaveNudge = inngest.createFunction(
  {
    id: "notif-streak-save",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const fired = await step.run("scan-and-send", async () => {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true, timezone: true },
      });
      let count = 0;
      for (const u of users) {
        const tz = u.timezone ?? "UTC";
        if (userLocalHour(tz) !== 20) continue;

        const todayStr = userTodayStr(tz);
        const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

        const dueHabits = await prisma.habit.findMany({
          where: { userId: u.id, active: true },
          select: { id: true, title: true, cadence: true, specificDays: true },
        });
        if (dueHabits.length === 0) continue;

        const completions = await prisma.habitCompletion.findMany({
          where: { userId: u.id, date: todayDate, status: "DONE" },
          select: { habitId: true },
        });
        const doneIds = new Set(completions.map((c) => c.habitId));
        const remaining = dueHabits.filter((h) => !doneIds.has(h.id)).length;
        if (remaining === 0) continue;

        // Only nudge users who have been engaged in the last 7 days
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentDone = await prisma.habitCompletion.count({
          where: { userId: u.id, status: "DONE", completedAt: { gte: weekAgo } },
        });
        if (recentDone === 0) continue;

        const body = remaining === 1
          ? "One habit left. Five minutes."
          : `${remaining} habits left. Both take five minutes.`;

        await send({
          userId: u.id,
          category: "streakSave",
          title: "Today's checklist",
          body,
          deepLink: "/today",
        });
        count++;
      }
      return count;
    });

    return { fired };
  },
);

// ── 3. Weekly review: hourly, fires Sunday user-local 19:00 ─────────────────
export const weeklyReviewNudge = inngest.createFunction(
  {
    id: "notif-weekly-review",
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const fired = await step.run("scan-and-send", async () => {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true, timezone: true },
      });
      let count = 0;
      for (const u of users) {
        const tz = u.timezone ?? "UTC";
        const dow = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" })
          .format(new Date());
        if (dow !== "Sun") continue;
        if (userLocalHour(tz) !== 19) continue;

        // Compute this week's done count
        const weekStart = (() => {
          const today = new Date(`${userTodayStr(tz)}T00:00:00.000Z`);
          const day = today.getUTCDay();
          const diff = day === 0 ? -6 : 1 - day;
          today.setUTCDate(today.getUTCDate() + diff);
          return today;
        })();
        const done = await prisma.scheduledWorkout.count({
          where: { userId: u.id, scheduledDate: { gte: weekStart }, status: "DONE" },
        });
        if (done === 0) continue; // no point reviewing a quiet week

        await send({
          userId: u.id,
          category: "weeklyReview",
          title: "Your week",
          body: `${done} workout${done === 1 ? "" : "s"} done. Tap to see how you tracked.`,
          deepLink: "/month",
        });
        count++;
      }
      return count;
    });

    return { fired };
  },
);

// ── 4. Reactive-adjustment notification: triggered by event, not cron ────────
// Fired by lib/coach/replan.ts when a constraint moves blocks. The replanner
// already creates a ChatSuggestion; this send adds a push so the user sees
// the change even if their tab is closed. Wired via inngest.send() from the
// replanner to keep this module pure.
export const reactiveAdjustmentSent = inngest.createFunction(
  {
    id: "notif-reactive-adjustment",
    triggers: [{ event: "planner/replan-summary" }],
  },
  async ({ event }: { event: { data: { userId: string; summary: string; deepLink?: string } } }) => {
    const { userId, summary, deepLink } = event.data;
    return send({
      userId,
      category: "reactiveAdjustment",
      title: "I updated your plan",
      body: summary.length > 110 ? summary.slice(0, 107) + "…" : summary,
      deepLink: deepLink ?? "/month",
    });
  },
);

export const notificationFunctions = [
  preWorkoutNudge,
  streakSaveNudge,
  weeklyReviewNudge,
  reactiveAdjustmentSent,
];
