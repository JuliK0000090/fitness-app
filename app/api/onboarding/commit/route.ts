/**
 * Atomic onboarding commit. Takes the (possibly user-edited) GoalDraft
 * from /welcome step 3 and writes everything in one transaction:
 *
 *   - Goal row
 *   - Habit rows (one per draft habit)
 *   - WorkoutType rows (upsert)
 *   - WeeklyTarget rows (one per workout type)
 *   - User flags: name, timezone, onboardingComplete=true, todayMode=RITUAL
 *
 * After the transaction, fires regenerateUserPlan() to seed 8 weeks of
 * ScheduledWorkout rows respecting the existing planner constraints.
 *
 * If anything fails partway, the transaction rolls back and the user
 * stays on /welcome step 3 (the GoalDraftCard) so they can retry.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { regenerateUserPlan } from "@/lib/coach/regenerate";

const HabitSchema = z.object({
  title: z.string().min(1).max(60),
  cadence: z.enum(["DAILY", "WEEKLY_N"]),
  targetPerWeek: z.number().min(1).max(7).optional().nullable(),
  durationMin: z.number().min(0).max(180).optional().nullable(),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "any"]).optional(),
  points: z.number().min(0).max(50).optional(),
});

const WorkoutSchema = z.object({
  workoutType: z.string().min(1).max(60),
  timesPerWeek: z.number().min(1).max(7),
});

const Body = z.object({
  name: z.string().min(1).max(60).optional(),
  timezone: z.string().min(2).max(60).optional(),
  draft: z.object({
    title: z.string().min(2).max(120),
    category: z.string().min(2).max(40),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    habits: z.array(HabitSchema).min(0).max(10),
    workouts: z.array(WorkoutSchema).min(0).max(8),
    measurements: z.array(z.string()).optional(),
  }),
});

function cadenceToType(c: "DAILY" | "WEEKLY_N"): "DAILY" | "WEEKLY_N" {
  return c;
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.userId;
  const body = Body.parse(await req.json());

  const goalId = await prisma.$transaction(async (tx) => {
    // 1. User updates
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.timezone && { timezone: body.timezone }),
        onboardingComplete: true,
        todayMode: "RITUAL",
      },
    });

    // 2. Goal
    const goal = await tx.goal.create({
      data: {
        userId,
        title: body.draft.title,
        description: body.draft.title,
        category: body.draft.category,
        visionText: body.draft.title,
        deadline: body.draft.deadline ? new Date(body.draft.deadline) : null,
        status: "active",
      },
    });

    // 3. Habits
    for (const h of body.draft.habits) {
      await tx.habit.create({
        data: {
          userId,
          goalId: goal.id,
          title: h.title,
          cadence: h.cadence === "WEEKLY_N" ? `${h.targetPerWeek ?? 3}x/week` : "daily",
          cadenceType: cadenceToType(h.cadence),
          duration: h.durationMin ?? null,
          icon: null,
          pointsOnComplete: h.points ?? 10,
          specificDays: [],
          active: true,
        },
      });
    }

    // 4. WorkoutTypes + WeeklyTargets
    for (const w of body.draft.workouts) {
      const wt = await tx.workoutType.upsert({
        where: { name: w.workoutType },
        create: {
          name: w.workoutType,
          slug: w.workoutType.toLowerCase().replace(/\s+/g, "_"),
          defaultDuration: 45,
        },
        update: {},
      });
      await tx.weeklyTarget.create({
        data: {
          userId,
          goalId: goal.id,
          workoutTypeId: wt.id,
          workoutTypeName: w.workoutType,
          targetCount: w.timesPerWeek,
        },
      });
    }

    return goal.id;
  });

  // 5. Generate the 8-week rolling horizon. Outside the transaction
  // because safeScheduleWorkout writes to PlanValidationLog and the
  // regen loop calls findMany inside, which doesn't compose cleanly
  // inside an interactive transaction.
  try {
    await regenerateUserPlan(userId);
  } catch (e) {
    console.error("[onboarding/commit] regenerate failed:", e);
    // Goal + targets are saved; the regenerator will run again at 02:00
    // user-local via cron. Don't fail the request.
  }

  return NextResponse.json({ goalId, ok: true });
}
