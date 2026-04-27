import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { critiqueWeekPlan } from "@/lib/coach/critique";
import { regenerateUserPlan } from "@/lib/coach/regenerate";

function cadenceStrToEnum(cadence: string) {
  const map: Record<string, "DAILY" | "WEEKLY_N" | "SPECIFIC_DAYS" | "EVERY_OTHER" | "WEEKDAYS" | "WEEKENDS"> = {
    daily: "DAILY", weekly_n: "WEEKLY_N", "2x/week": "WEEKLY_N",
    "3x/week": "WEEKLY_N", "5x/week": "WEEKLY_N", weekdays: "WEEKDAYS", weekends: "WEEKENDS",
  };
  return map[cadence.toLowerCase()] ?? "DAILY";
}

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireSession(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.userId;

  const body = await req.json();
  const { title, category, visionText, deadline, habits, workouts } = body;

  const deadlineDate = deadline ? new Date(deadline) : undefined;

  // Create goal
  const goal = await prisma.goal.create({
    data: {
      userId,
      title,
      description: visionText ?? title,
      category: category ?? "lifestyle",
      visionText: visionText ?? null,
      deadline: deadlineDate,
      status: "active",
    },
  });

  // Create habits
  if (Array.isArray(habits)) {
    await Promise.all(habits.map((h: { title: string; cadence?: string; duration?: number; icon?: string; pointsOnComplete?: number }) =>
      prisma.habit.create({
        data: {
          userId,
          goalId: goal.id,
          title: h.title,
          cadence: h.cadence ?? "daily",
          cadenceType: cadenceStrToEnum(h.cadence ?? "daily"),
          duration: h.duration ?? null,
          icon: h.icon ?? null,
          pointsOnComplete: h.pointsOnComplete ?? 10,
          specificDays: [],
          active: true,
        },
      })
    ));
  }

  // Create WorkoutTypes + WeeklyTargets. Actual ScheduledWorkout rows are
  // produced by the 8-week rolling regenerator below, so the horizon
  // matches the rest of the app's expectations and re-runs are idempotent.
  const now = new Date();

  if (Array.isArray(workouts)) {
    await Promise.all(workouts.map(async (w: { workoutTypeName: string; timesPerWeek: number; duration?: number }) => {
      const wt = await prisma.workoutType.upsert({
        where: { name: w.workoutTypeName },
        create: { name: w.workoutTypeName, slug: w.workoutTypeName.toLowerCase().replace(/\s+/g, "_"), defaultDuration: w.duration ?? 45 },
        update: {},
      });
      await prisma.weeklyTarget.create({
        data: { userId, goalId: goal.id, workoutTypeId: wt.id, workoutTypeName: w.workoutTypeName, targetCount: w.timesPerWeek },
      });
    }));
  }

  // Generate the 8-week rolling horizon for this user. Idempotent — running
  // it again later from the daily cron or another goal change won't duplicate.
  await regenerateUserPlan(userId);

  // Critique pass — Claude reviews the committed plan as a subjective safety net.
  // Issues are logged but don't block the response since the mechanical validator
  // already enforced the hard rules.
  try {
    const planned = await prisma.scheduledWorkout.findMany({
      where: {
        userId,
        goalId: goal.id,
        scheduledDate: { gte: now },
        status: "PLANNED",
      },
      orderBy: { scheduledDate: "asc" },
      take: 28,
    });
    const critique = await critiqueWeekPlan(planned, userId);
    if (!critique.ok && critique.issues.length > 0) {
      console.warn("[planner] critique flagged issues for", goal.id, critique.issues);
    }
  } catch (e) {
    console.error("[planner] critique failed:", e);
  }

  return NextResponse.json({ goalId: goal.id, title });
}
