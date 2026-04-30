/**
 * Admin force-test for the Phase 3 wearable loop.
 *
 * Runs against the calling admin user's own account (never another
 * user) and follows roughly the same shape as the test plan from the
 * dashboard rebuild spec:
 *
 *   1. Find or create a "10,000 steps" wearable habit
 *   2. Stage HealthDaily for today (?steps=8500 by default)
 *   3. Try the late-day nudge logic (returns the gap and what it would say)
 *   4. Stage HealthDaily again (?steps2=10500) and run resolveWearableHabit
 *   5. Return what would have been written
 *
 * Side-effecting actions are guarded behind ?write=1 — by default this
 * is a dry-run that returns the decision the loop would make without
 * actually writing HabitCompletion or sending a push.
 *
 *   GET /api/admin/test-wearable-loop?steps=8500           → dry-run
 *   GET /api/admin/test-wearable-loop?steps=8500&write=1   → applies
 *
 * Idempotent: re-running with the same inputs produces the same final
 * state. The HealthDaily upserts and the step-2 resolveWearableHabit
 * call are both safe to repeat.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveWearableHabit } from "@/lib/habits/wearable-resolution";
import { userToday } from "@/lib/time/today";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "juliana.kolarski@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, timezone: true },
  });
  if (!me || !ADMIN_EMAILS.includes(me.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.userId;
  const tz = me.timezone ?? "UTC";
  const today = userToday(tz);

  const apply = req.nextUrl.searchParams.get("write") === "1";
  const steps = parseInt(req.nextUrl.searchParams.get("steps") ?? "8500", 10);
  const steps2Param = req.nextUrl.searchParams.get("steps2");
  const steps2 = steps2Param ? parseInt(steps2Param, 10) : null;

  const trace: string[] = [];

  // 1. Find or create a wearable steps habit
  let habit = await prisma.habit.findFirst({
    where: { userId, metricKey: "steps", trackingMode: "WEARABLE_AUTO" },
  });
  if (!habit && apply) {
    habit = await prisma.habit.create({
      data: {
        userId, title: "10,000 steps (test)", cadence: "daily",
        cadenceType: "DAILY", icon: "Footprints", pointsOnComplete: 15,
        active: true,
        trackingMode: "WEARABLE_AUTO",
        metricKey: "steps",
        metricTarget: 10000,
        metricComparison: "GTE",
      },
    });
    trace.push(`created test habit ${habit.id}`);
  } else if (habit) {
    trace.push(`using existing habit ${habit.id}: "${habit.title}" target=${habit.metricTarget}`);
  } else {
    return NextResponse.json({
      error: "No wearable steps habit and write=1 not set",
      hint: "Add ?write=1 to create a test habit, or create one in /habits.",
    }, { status: 400 });
  }

  // 2. Stage HealthDaily steps for today
  if (apply) {
    await prisma.healthDaily.upsert({
      where: { userId_date_metric: { userId, date: today, metric: "steps" } },
      create: {
        userId, date: today, metric: "steps",
        value: steps, unit: "count", source: "test",
        sources: { test: steps } as object, trust: 100, overridden: false,
      },
      update: { value: steps, source: "test", computedAt: new Date() },
    });
    trace.push(`HealthDaily steps=${steps} for ${today.toISOString().split("T")[0]}`);
  } else {
    trace.push(`would set HealthDaily steps=${steps}`);
  }

  // 3. Late-day nudge decision
  const target = habit.metricTarget!;
  const gap = target - steps;
  const gapPct = (gap / target) * 100;
  const wouldNudge = gap > 0 && gapPct >= 5 && gapPct <= 25;
  const minutesToFix = wouldNudge ? Math.max(1, Math.round(gap / 100)) : null;
  const nudgeBody = wouldNudge
    ? `${gap.toLocaleString()} steps to ${target.toLocaleString()}. A ${minutesToFix}-minute walk would do it.`
    : null;
  trace.push(`gap=${gap} gapPct=${gapPct.toFixed(1)}% → ${wouldNudge ? "WOULD NUDGE" : "no nudge"}`);

  // 4. Resolve at end of day
  const beforeResolve = await resolveWearableHabit(habit.id, today);
  trace.push(`resolveWearableHabit(steps=${steps}): resolved=${beforeResolve.resolved} status=${beforeResolve.status} value=${beforeResolve.actualValue}`);

  // 5. Optional second pass — simulate later in the day
  let afterResolve = null;
  if (steps2 !== null) {
    if (apply) {
      await prisma.healthDaily.upsert({
        where: { userId_date_metric: { userId, date: today, metric: "steps" } },
        create: {
          userId, date: today, metric: "steps",
          value: steps2, unit: "count", source: "test",
          sources: { test: steps2 } as object, trust: 100, overridden: false,
        },
        update: { value: steps2, source: "test", computedAt: new Date() },
      });
      trace.push(`HealthDaily steps=${steps2} (later in day)`);
    } else {
      trace.push(`would set HealthDaily steps=${steps2}`);
    }
    afterResolve = await resolveWearableHabit(habit.id, today);
    trace.push(`resolveWearableHabit(steps=${steps2}): resolved=${afterResolve.resolved} status=${afterResolve.status} value=${afterResolve.actualValue}`);
  }

  return NextResponse.json({
    write: apply,
    user: me.email,
    timezone: tz,
    today: today.toISOString().split("T")[0],
    habit: { id: habit.id, title: habit.title, metricKey: habit.metricKey, metricTarget: habit.metricTarget, metricComparison: habit.metricComparison },
    lateDayNudgeDecision: {
      gap, gapPct: Math.round(gapPct * 10) / 10,
      wouldFire: wouldNudge,
      copy: nudgeBody,
    },
    resolution: {
      atSteps: { steps, ...beforeResolve },
      atSteps2: steps2 !== null ? { steps: steps2, ...afterResolve } : null,
    },
    trace,
  });
}
