/**
 * Privacy-by-default summary builder. Given a userId + week boundaries,
 * returns the bundle that the partner-facing emails are allowed to see.
 *
 * NEVER include: weight, body fat, measurements, goal text/title,
 * workout names beyond category, photos, chat history.
 *
 * The TS types here ARE the privacy contract — anything not on
 * `PartnerWeekSummary` is structurally inaccessible to the email
 * template / encouragement page.
 */

import { addDays, getISOWeek, getYear } from "date-fns";
import { prisma } from "@/lib/prisma";

export type PartnerWeekSummary = {
  userFirstName: string;     // first token of name only — never email or last name
  workoutsDone: number;
  workoutsPlanned: number;
  habitAdherencePct: number; // 0..100, integer
  streakDays: number;
  streakAlive: boolean;
  notable: string | null;
  weekOfYear: number;
  yearNumber: number;
};

function utcMondayOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  const day = out.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setUTCDate(out.getUTCDate() + diff);
  return out;
}

export async function buildWeekSummary(userId: string, ref: Date = new Date()): Promise<PartnerWeekSummary> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, currentStreak: true },
  });

  const monday = utcMondayOfWeek(ref);
  const nextMonday = addDays(monday, 7);

  // Workouts this week — count DONE vs all (any non-MOVED) on past-or-today
  const sw = await prisma.scheduledWorkout.findMany({
    where: {
      userId,
      scheduledDate: { gte: monday, lt: nextMonday },
    },
    select: { status: true },
  });
  const planned = sw.filter((w) => w.status !== "MOVED").length;
  const done = sw.filter((w) => w.status === "DONE").length;

  // Habits adherence — average of (DONE rows / active habits) per past-or-today day in the week
  const habits = await prisma.habit.count({ where: { userId, active: true } });
  let adherenceNumerator = 0;
  let adherenceDenominator = 0;
  if (habits > 0) {
    for (let i = 0; i < 7; i++) {
      const day = addDays(monday, i);
      if (day > new Date()) break; // don't count future days
      const completionsForDay = await prisma.habitCompletion.count({
        where: { userId, date: day, status: "DONE" },
      });
      adherenceNumerator += completionsForDay;
      adherenceDenominator += habits;
    }
  }
  const habitAdherencePct = adherenceDenominator > 0
    ? Math.round((adherenceNumerator / adherenceDenominator) * 100)
    : 0;

  // First name only — strip last name, strip email-like values
  const rawName = (user.name ?? "").trim();
  const firstName = rawName.split(/\s+/)[0] || "your friend";

  // Notable narrative — kept generic so it doesn't leak the goal text
  let notable: string | null = null;
  if (planned > 0 && done >= planned) {
    notable = "She hit every workout this week.";
  } else if (done === 0 && planned === 0 && habitAdherencePct === 0) {
    notable = "Quiet week. She'd appreciate hearing from you.";
  } else if (user.currentStreak >= 30) {
    notable = `She's on a ${user.currentStreak}-day streak.`;
  }

  return {
    userFirstName: firstName,
    workoutsDone: done,
    workoutsPlanned: planned,
    habitAdherencePct,
    streakDays: user.currentStreak,
    streakAlive: user.currentStreak > 0,
    notable,
    weekOfYear: getISOWeek(monday),
    yearNumber: getYear(monday),
  };
}

export function appUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "https://fitness-app-production-2ef2.up.railway.app";
}
