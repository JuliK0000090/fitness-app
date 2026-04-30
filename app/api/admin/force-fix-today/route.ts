/**
 * Manual recovery: re-roll today's HaeDaily for the calling user, then
 * fire the habit rollover for them. Use after the bug fixes deploy so
 * the existing data reflects the corrected logic without waiting for
 * the next scheduled job tick.
 *
 *   GET /api/admin/force-fix-today
 *
 * Idempotent. Admin-gated.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rollupDailyForDate } from "@/lib/health/process-hae";
import { markMissedHabits } from "@/lib/habits/complete";
import { userTodayStr, userYesterday } from "@/lib/time/today";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, timezone: true },
  });
  if (!me || !ADMIN_EMAILS.includes(me.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tz = me.timezone || "America/Toronto";
  const todayStr = userTodayStr(tz);
  const yesterday = userYesterday(tz);

  // 1. Re-roll today's HaeDaily/HealthDaily so the steps fix takes effect.
  let stepsAfter: number | null = null;
  let rerollDone = false;
  let rerollError: string | null = null;
  try {
    await rollupDailyForDate(me.id, todayStr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const haeDaily = await (prisma as any).haeDaily.findUnique({
      where: { userId_date: { userId: me.id, date: new Date(todayStr + "T00:00:00.000Z") } },
      select: { steps: true },
    });
    stepsAfter = haeDaily?.steps ?? null;
    rerollDone = true;
  } catch (e) {
    rerollError = e instanceof Error ? e.message : String(e);
    console.error("[force-fix-today] reroll failed:", rerollError);
  }

  // 2. Run the habit rollover for yesterday → MISSED rows for any habit
  //    that didn't get a completion. Stamp lastRolloverDate ONLY after
  //    markMissedHabits succeeds, so the integrity check doesn't go
  //    green when the underlying rows weren't actually written.
  let missedCount = 0;
  let rolloverDone = false;
  let rolloverError: string | null = null;
  try {
    missedCount = await markMissedHabits(me.id, yesterday);
    await prisma.user.update({
      where: { id: me.id },
      data: { lastRolloverDate: new Date(todayStr + "T00:00:00.000Z") },
    });
    rolloverDone = true;
  } catch (e) {
    rolloverError = e instanceof Error ? e.message : String(e);
    console.error("[force-fix-today] rollover failed:", rolloverError);
  }

  return NextResponse.json({
    user: me.email,
    timezone: tz,
    today: todayStr,
    rerollDone,
    rerollError,
    stepsAfterReroll: stepsAfter,
    rolloverDone,
    rolloverError,
    yesterdayMissedRowsCreated: missedCount,
    next: rerollDone && rolloverDone
      ? "Open /api/dev/integrity-check to verify allGood:true"
      : "One step failed — check the error fields above before re-running.",
  });
}
