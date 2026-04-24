import { z } from "zod";
import { prisma } from "./prisma";
import { matchPreset } from "./plans/presets";
import { addDays, startOfWeek, format, parseISO, isValid } from "date-fns";

// ─── XP constants ─────────────────────────────────────────────────────────────
const XP = {
  HABIT_COMPLETE: 10,
  WORKOUT_COMPLETE: 50,
  WORKOUT_LATE: 35,
  ALL_HABITS_BONUS: 25,
  MEASUREMENT: 5,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function toDate(str: string): Date {
  const d = parseISO(str);
  return isValid(d) ? d : new Date(str);
}

async function grantXp(userId: string, amount: number): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { totalXp: { increment: amount } },
    select: { totalXp: true },
  });
  return user.totalXp;
}

// Level: N requires 50 * N * (N+1) cumulative XP
function computeLevel(totalXp: number) {
  const level = Math.floor(Math.sqrt(totalXp / 50));
  const currentFloor = 50 * level * (level + 1);
  const nextFloor = 50 * (level + 1) * (level + 2);
  return {
    level: Math.max(1, level),
    totalXp,
    xpToNext: nextFloor - totalXp,
    xpInLevel: totalXp - currentFloor,
  };
}

// ─── Tool factory ─────────────────────────────────────────────────────────────
// Wraps execute so tool errors never crash the stream — they return a structured
// error result that the AI can read and relay to the user gracefully.
function makeTool<TInput, TOutput>(config: {
  description: string;
  parameters: z.ZodType<TInput>;
  execute: (input: TInput) => Promise<TOutput>;
}) {
  return {
    ...config,
    execute: async (input: TInput): Promise<TOutput | { error: string }> => {
      try {
        return await config.execute(input);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error(`[vita-tool] error:`, msg);
        return { error: msg };
      }
    },
  };
}

// ─── Tool definitions ─────────────────────────────────────────────────────────
export function vitaTools(userId: string) {
  return {

    // ── Goal tools ─────────────────────────────────────────────────────────────

    propose_goal_decomposition: makeTool({
      description: "Parse a natural-language goal and return a structured draft (does NOT write to DB). Always call this before create_full_plan.",
      parameters: z.object({
        user_text: z.string().describe("The user's goal in their own words"),
        preferred_deadline_weeks: z.number().optional().describe("How many weeks until deadline"),
      }),
      execute: async ({ user_text, preferred_deadline_weeks }) => {
        const preset = matchPreset(user_text);
        const deadlineWeeks = preferred_deadline_weeks ?? preset?.suggestedDeadlineWeeks ?? 12;
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + deadlineWeeks * 7);

        if (preset) {
          return {
            matched_preset: preset.slug,
            title: preset.title,
            category: preset.category,
            visionText: user_text,
            targetMetric: preset.defaultMeasurements[0] ?? null,
            deadline: deadlineDate.toISOString().split("T")[0],
            deadlineWeeks,
            habits: preset.defaultHabits,
            workouts: preset.defaultWorkouts,
            measurements: preset.defaultMeasurements,
          };
        }

        // No preset — generic decomposition
        return {
          matched_preset: null,
          title: user_text.slice(0, 80),
          category: "lifestyle",
          visionText: user_text,
          targetMetric: null,
          deadline: deadlineDate.toISOString().split("T")[0],
          deadlineWeeks,
          habits: [
            { title: "Daily check-in", cadence: "daily", icon: "CheckCircle" },
          ],
          workouts: [],
          measurements: ["weight_kg"],
        };
      },
    }),

    create_full_plan: makeTool({
      description: "Create a goal, its habits, weekly workout targets, and 4 weeks of scheduled workouts in one atomic operation. Only call after the user confirms the draft from propose_goal_decomposition.",
      parameters: z.object({
        title: z.string(),
        category: z.string().optional(),
        visionText: z.string().optional(),
        targetMetric: z.string().optional(),
        targetValue: z.number().optional(),
        unit: z.string().optional(),
        deadline: z.string().optional().describe("ISO date YYYY-MM-DD"),
        habits: z.array(z.object({
          title: z.string(),
          cadence: z.string().default("daily"),
          targetPerWeek: z.number().optional(),
          specificDays: z.array(z.number()).optional(),
          duration: z.number().optional(),
          icon: z.string().optional(),
          pointsOnComplete: z.number().optional(),
        })),
        workouts: z.array(z.object({
          workoutTypeName: z.string(),
          timesPerWeek: z.number(),
          duration: z.number().default(45),
          icon: z.string().optional(),
        })),
      }),
      execute: async ({ title, category, visionText, targetMetric, targetValue, unit, deadline, habits, workouts }) => {
        const deadlineDate = deadline ? toDate(deadline) : undefined;

        // Create the goal
        const goal = await prisma.goal.create({
          data: {
            userId,
            title,
            description: visionText ?? title, // compat
            category: category ?? "lifestyle",
            visionText: visionText ?? null,
            targetMetric: targetMetric ?? null,
            targetValue: targetValue ?? null,
            unit: unit ?? null,
            deadline: deadlineDate,
            status: "active",
          },
        });

        // Create habits
        const createdHabits = await Promise.all(habits.map((h) =>
          prisma.habit.create({
            data: {
              userId,
              goalId: goal.id,
              title: h.title,
              cadence: h.cadence ?? "daily",
              cadenceType: cadenceStrToEnum(h.cadence ?? "daily"),
              targetPerWeek: h.targetPerWeek ?? null,
              specificDays: h.specificDays ?? [],
              duration: h.duration ?? null,
              icon: h.icon ?? null,
              pointsOnComplete: h.pointsOnComplete ?? 10,
              active: true,
            },
          })
        ));

        // Create weekly targets and schedule 4 weeks of workouts
        const scheduledWorkouts: { date: string; name: string }[] = [];
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday

        await Promise.all(workouts.map(async (w) => {
          // Upsert WorkoutType by name
          const wt = await prisma.workoutType.upsert({
            where: { name: w.workoutTypeName },
            create: {
              name: w.workoutTypeName,
              slug: w.workoutTypeName.toLowerCase().replace(/\s+/g, "_"),
              icon: w.icon ?? "Dumbbell",
              defaultDuration: w.duration,
            },
            update: {},
          });

          // Weekly target
          await prisma.weeklyTarget.create({
            data: {
              userId,
              goalId: goal.id,
              workoutTypeId: wt.id,
              workoutTypeName: w.workoutTypeName,
              targetCount: w.timesPerWeek,
            },
          });

          // 4 weeks of scheduled sessions — spread evenly across week days
          const days = spreadDaysInWeek(w.timesPerWeek);
          for (let week = 0; week < 4; week++) {
            for (const dayOffset of days) {
              const date = addDays(weekStart, week * 7 + dayOffset);
              if (date < now) continue; // don't schedule past dates
              const sw = await (prisma.scheduledWorkout as any).create({
                data: {
                  userId,
                  goalId: goal.id,
                  workoutTypeId: wt.id,
                  workoutTypeName: w.workoutTypeName,
                  scheduledDate: date,
                  duration: w.duration,
                  status: "PLANNED",
                  source: "ai_suggested",
                },
              });
              scheduledWorkouts.push({ date: format(date, "yyyy-MM-dd"), name: w.workoutTypeName });
              void sw; // used for side effects
            }
          }
        }));

        // Generate avatar milestones (fire-and-forget, non-blocking)
        if (deadlineDate) {
          import("@/lib/avatar/milestones").then(({ generateMilestonesForGoal }) => {
            generateMilestonesForGoal(goal.id).catch(() => { /* non-critical */ });
          });
        }

        return {
          goalId: goal.id,
          title: goal.title ?? goal.description,
          habitsCreated: createdHabits.length,
          workoutsScheduled: scheduledWorkouts.length,
          deadline: deadline ?? null,
          nextSteps: "Open /today to see your checklist.",
        };
      },
    }),

    update_goal: makeTool({
      description: "Update a goal's title, deadline, status, or target value",
      parameters: z.object({
        goalId: z.string(),
        title: z.string().optional(),
        status: z.enum(["active", "paused", "achieved", "archived"]).optional(),
        deadline: z.string().optional(),
        targetValue: z.number().optional(),
        currentValue: z.number().optional(),
      }),
      execute: async ({ goalId, deadline, ...rest }) => {
        const data: Record<string, unknown> = { ...rest };
        if (deadline) data.deadline = toDate(deadline);
        await prisma.goal.update({ where: { id: goalId, userId }, data });
        return { ok: true, goalId };
      },
    }),

    list_goals: makeTool({
      description: "List all goals (active, paused, achieved). Use status filter only if user explicitly asks for a specific status. Always call this when you need to know the user's goals or goal IDs.",
      parameters: z.object({ status: z.string().optional().describe("Filter by status — omit to return all goals including active, paused, and achieved") }),
      execute: async ({ status }) => {
        const goals = await prisma.goal.findMany({
          where: { userId, ...(status ? { status } : { status: { not: "archived" } }) },
          orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
          include: { habits: { where: { active: true }, select: { id: true, title: true, icon: true } } },
        });
        return { goals: goals.map((g) => ({
          goalId: g.id,
          title: g.title ?? g.description,
          category: g.category,
          status: g.status,
          deadline: g.deadline?.toISOString().split("T")[0] ?? null,
          targetMetric: g.targetMetric,
          targetValue: g.targetValue,
          currentValue: g.currentValue,
          predictedHitDate: g.predictedHitDate?.toISOString().split("T")[0] ?? null,
          habitCount: g.habits.length,
        })) };
      },
    }),

    // ── Habit tools ────────────────────────────────────────────────────────────

    add_habit: makeTool({
      description: "Add a new standalone habit. If the user says they ALREADY did this today, set markDoneToday: true to log it immediately in one step.",
      parameters: z.object({
        title: z.string(),
        cadence: z.string().default("daily"),
        targetPerWeek: z.number().optional(),
        duration: z.number().optional(),
        icon: z.string().optional(),
        goalId: z.string().optional(),
        pointsOnComplete: z.number().optional(),
        markDoneToday: z.boolean().optional().describe("Set true if the user said they already did this habit today"),
      }),
      execute: async (input) => {
        const habit = await prisma.habit.create({
          data: {
            userId,
            title: input.title,
            description: null,
            cadence: input.cadence ?? "daily",
            cadenceType: cadenceStrToEnum(input.cadence ?? "daily"),
            targetPerWeek: input.targetPerWeek ?? null,
            duration: input.duration ?? null,
            icon: input.icon ?? null,
            goalId: input.goalId ?? null,
            pointsOnComplete: input.pointsOnComplete ?? 10,
            active: true,
          },
        });

        let completedToday = false;
        let xpAwarded = 0;
        if (input.markDoneToday) {
          const dateObj = new Date(todayStr());
          await (prisma.habitCompletion as any).upsert({
            where: { habitId_date: { habitId: habit.id, date: dateObj } },
            create: { habitId: habit.id, userId, date: dateObj, points: habit.pointsOnComplete, status: "DONE", source: "MANUAL", completedAt: new Date() },
            update: {},
          });
          await prisma.user.update({ where: { id: userId }, data: { totalXp: { increment: habit.pointsOnComplete } } });
          completedToday = true;
          xpAwarded = habit.pointsOnComplete;
        }

        return {
          habitId: habit.id,
          title: habit.title,
          name: habit.title, // backward compat
          cadence: habit.cadence,
          currentStreak: completedToday ? 1 : 0,
          longestStreak: 0,
          completedToday,
          xpAwarded,
        };
      },
    }),

    list_habits: makeTool({
      description: "List active habits with today's completion status",
      parameters: z.object({}),
      execute: async () => {
        const habits = await prisma.habit.findMany({
          where: { userId, active: true },
          orderBy: { createdAt: "asc" },
          include: {
            completions: {
              where: { date: new Date(todayStr()) },
              take: 1,
            },
          },
        });
        return { habits: habits.map((h) => ({
          habitId: h.id,
          title: h.title,
          cadence: h.cadence,
          duration: h.duration,
          icon: h.icon,
          pointsOnComplete: h.pointsOnComplete,
          doneToday: h.completions.length > 0,
        })) };
      },
    }),

    complete_habit: makeTool({
      description: "Mark a habit as done for today (or a specific date). Idempotent.",
      parameters: z.object({
        habitId: z.string(),
        date: z.string().optional().describe("YYYY-MM-DD, defaults to today"),
        note: z.string().optional(),
      }),
      execute: async ({ habitId, date, note }) => {
        const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
        if (!habit) throw new Error("Habit not found");

        const dateObj = new Date(date ?? todayStr());

        const { completion, totalXp, bonus } = await prisma.$transaction(async (tx) => {
          const completion = await (tx.habitCompletion as any).upsert({
            where: { habitId_date: { habitId, date: dateObj } },
            create: { habitId, userId, date: dateObj, note: note ?? null, points: habit.pointsOnComplete, status: "DONE", source: "MANUAL", completedAt: new Date() },
            update: { note: note ?? undefined },
          });

          // Grant base XP
          const updated = await tx.user.update({
            where: { id: userId },
            data: { totalXp: { increment: habit.pointsOnComplete } },
            select: { totalXp: true },
          });

          // Check all-habits-done bonus
          const activeHabits = await tx.habit.count({ where: { userId, active: true } });
          const doneToday = await tx.habitCompletion.count({ where: { userId, date: dateObj } });
          let bonus = 0;
          if (doneToday === activeHabits && activeHabits > 0) {
            bonus = XP.ALL_HABITS_BONUS;
            await tx.user.update({
              where: { id: userId },
              data: { totalXp: { increment: bonus } },
            });
          }

          return { completion, totalXp: updated.totalXp, bonus };
        });

        return {
          completionId: completion.id,
          habitTitle: habit.title,
          pointsEarned: habit.pointsOnComplete + bonus,
          bonusEarned: bonus > 0,
          ...computeLevel(totalXp + bonus),
        };
      },
    }),

    uncomplete_habit: makeTool({
      description: "Un-mark a habit completion for a date",
      parameters: z.object({
        habitId: z.string(),
        date: z.string().optional(),
      }),
      execute: async ({ habitId, date }) => {
        const dateObj = new Date(date ?? todayStr());
        await prisma.habitCompletion.deleteMany({ where: { habitId, userId, date: dateObj } });
        return { ok: true };
      },
    }),

    update_habit: makeTool({
      description: "Update a habit's title, cadence, or active status",
      parameters: z.object({
        habitId: z.string(),
        title: z.string().optional(),
        cadence: z.string().optional(),
        targetPerWeek: z.number().optional(),
        active: z.boolean().optional(),
        icon: z.string().optional(),
      }),
      execute: async ({ habitId, cadence, ...rest }) => {
        const data: Record<string, unknown> = { ...rest };
        if (cadence) {
          data.cadence = cadence;
          data.cadenceType = cadenceStrToEnum(cadence);
        }
        await prisma.habit.update({ where: { id: habitId, userId }, data });
        return { ok: true, habitId };
      },
    }),

    // ── Workout scheduling tools ───────────────────────────────────────────────

    schedule_workout: makeTool({
      description: "Schedule a future workout session",
      parameters: z.object({
        workoutTypeName: z.string(),
        scheduledDate: z.string().describe("YYYY-MM-DD"),
        scheduledTime: z.string().optional().describe("HH:MM"),
        duration: z.number().default(45),
        goalId: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async ({ workoutTypeName, scheduledDate, scheduledTime, duration, goalId, notes }) => {
        const wt = await prisma.workoutType.upsert({
          where: { name: workoutTypeName },
          create: { name: workoutTypeName, slug: workoutTypeName.toLowerCase().replace(/\s+/g, "_"), defaultDuration: duration },
          update: {},
        });
        const sw = await (prisma.scheduledWorkout as any).create({
          data: {
            userId,
            goalId: goalId ?? null,
            workoutTypeId: wt.id,
            workoutTypeName,
            scheduledDate: toDate(scheduledDate),
            scheduledTime: scheduledTime ?? null,
            duration,
            notes: notes ?? null,
            status: "PLANNED",
            source: "ai_suggested",
          },
        });
        return { scheduledWorkoutId: sw.id, workoutTypeName, scheduledDate, scheduledTime };
      },
    }),

    reschedule_workout: makeTool({
      description: "Move a scheduled workout to a different date/time",
      parameters: z.object({
        scheduledWorkoutId: z.string(),
        newDate: z.string().describe("YYYY-MM-DD"),
        newTime: z.string().optional(),
      }),
      execute: async ({ scheduledWorkoutId, newDate, newTime }) => {
        await prisma.scheduledWorkout.update({
          where: { id: scheduledWorkoutId, userId },
          data: {
            scheduledDate: toDate(newDate),
            scheduledTime: newTime ?? undefined,
            status: "MOVED",
          },
        });
        return { ok: true, newDate, newTime };
      },
    }),

    complete_workout: makeTool({
      description: "Mark a scheduled workout as done and log it",
      parameters: z.object({
        scheduledWorkoutId: z.string(),
        durationMin: z.number().optional(),
        intensity: z.number().min(1).max(10).optional(),
        notes: z.string().optional(),
      }),
      execute: async ({ scheduledWorkoutId, durationMin, intensity, notes }) => {
        const sw = await prisma.scheduledWorkout.findFirst({
          where: { id: scheduledWorkoutId, userId },
        });
        if (!sw) throw new Error("Scheduled workout not found");

        // Create WorkoutLog
        const log = await prisma.workoutLog.create({
          data: {
            userId,
            typeId: sw.workoutTypeId ?? null,
            workoutName: sw.workoutTypeName ?? "Workout",
            durationMin: durationMin ?? sw.duration,
            intensity: intensity ?? null,
            notes: notes ?? null,
            xpAwarded: XP.WORKOUT_COMPLETE,
          },
        });

        // Mark scheduled as done
        await prisma.scheduledWorkout.update({
          where: { id: scheduledWorkoutId },
          data: { status: "DONE", completedAt: new Date(), workoutLogId: log.id, pointsEarned: XP.WORKOUT_COMPLETE },
        });

        const totalXp = await grantXp(userId, XP.WORKOUT_COMPLETE);

        return {
          workoutLogId: log.id,
          workoutName: log.workoutName,
          durationMin: log.durationMin,
          xpAwarded: XP.WORKOUT_COMPLETE,
          ...computeLevel(totalXp),
        };
      },
    }),

    log_workout: makeTool({
      description: "Log a workout the user has already completed — use this when the user says they JUST DID a workout (not pre-scheduled). For scheduled workouts, use complete_workout instead.",
      parameters: z.object({
        workoutName: z.string().describe("Name of the workout, e.g. 'Hot Yoga', 'Run', 'HIIT'"),
        durationMin: z.number().describe("Duration in minutes"),
        intensity: z.number().min(1).max(10).optional().describe("Perceived effort 1-10"),
        caloriesEst: z.number().optional(),
        notes: z.string().optional(),
        date: z.string().optional().describe("YYYY-MM-DD, defaults to today"),
      }),
      execute: async ({ workoutName, durationMin, intensity, caloriesEst, notes, date }) => {
        const startedAt = date ? toDate(date) : new Date();
        const log = await prisma.workoutLog.create({
          data: {
            userId,
            workoutName,
            startedAt,
            durationMin,
            intensity: intensity ?? null,
            caloriesEst: caloriesEst ?? null,
            notes: notes ?? null,
            source: "manual",
            xpAwarded: XP.WORKOUT_COMPLETE,
          },
        });
        const totalXp = await grantXp(userId, XP.WORKOUT_COMPLETE);
        return {
          workoutId: log.id,
          workoutName: log.workoutName,
          durationMin: log.durationMin,
          intensity: log.intensity,
          caloriesEst: log.caloriesEst,
          xpAwarded: XP.WORKOUT_COMPLETE,
          ...computeLevel(totalXp),
        };
      },
    }),

    skip_workout: makeTool({
      description: "Mark a scheduled workout as skipped",
      parameters: z.object({
        scheduledWorkoutId: z.string(),
        reason: z.string().optional(),
      }),
      execute: async ({ scheduledWorkoutId, reason }) => {
        await prisma.scheduledWorkout.update({
          where: { id: scheduledWorkoutId, userId },
          data: { status: "SKIPPED", skippedReason: reason ?? null },
        });
        return { ok: true };
      },
    }),

    // ── Measurement tools ──────────────────────────────────────────────────────

    log_measurement: makeTool({
      description: "Log a body measurement (weight, waist, hips, body fat %, etc.)",
      parameters: z.object({
        kind: z.string().describe("weight_kg / waist_cm / hips_cm / body_fat_pct / glute_cm / thigh_cm / etc."),
        value: z.number(),
        unit: z.string().optional(),
        date: z.string().optional(),
        goalId: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async ({ kind, value, unit, date, goalId, notes }) => {
        const capturedAt = date ? toDate(date) : new Date();
        const m = await prisma.measurement.create({
          data: { userId, kind, value, unit: unit ?? inferUnit(kind), capturedAt, goalId: goalId ?? null, notes: notes ?? null },
        });
        await grantXp(userId, XP.MEASUREMENT);

        // Update goal currentValue if linked
        if (goalId) {
          await prisma.goal.update({ where: { id: goalId }, data: { currentValue: value } });
        }

        // Previous value for delta
        const prev = await prisma.measurement.findFirst({
          where: { userId, kind, id: { not: m.id } },
          orderBy: { capturedAt: "desc" },
        });
        const delta = prev ? value - prev.value : null;

        return { measurementId: m.id, kind, value, unit: m.unit, delta, xpEarned: XP.MEASUREMENT };
      },
    }),

    list_measurements: makeTool({
      description: "List recent measurements, optionally filtered by kind",
      parameters: z.object({ kind: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ kind, limit }) => {
        const rows = await prisma.measurement.findMany({
          where: { userId, ...(kind ? { kind } : {}) },
          orderBy: { capturedAt: "desc" },
          take: limit ?? 20,
        });
        return { measurements: rows.map((r) => ({ id: r.id, kind: r.kind, value: r.value, unit: r.unit, date: r.capturedAt.toISOString().split("T")[0] })) };
      },
    }),

    // ── Profile / utility tools ────────────────────────────────────────────────

    get_profile: makeTool({
      description: "Get the user's profile, current XP level, active goals and habits",
      parameters: z.object({}),
      execute: async () => {
        const user = await prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { name: true, heightCm: true, activityLevel: true, goalWeightKg: true, totalXp: true, currentStreak: true, bestStreak: true },
        });
        const activeGoals = await prisma.goal.count({ where: { userId, status: "active" } });
        const activeHabits = await prisma.habit.count({ where: { userId, active: true } });
        return { ...user, activeGoals, activeHabits, ...computeLevel(user.totalXp) };
      },
    }),

    get_today_plan: makeTool({
      description: "Get today's habits and scheduled workout",
      parameters: z.object({}),
      execute: async () => {
        const today = new Date(todayStr());
        const [habits, scheduledWorkouts, completions] = await Promise.all([
          prisma.habit.findMany({
            where: { userId, active: true },
            orderBy: { createdAt: "asc" },
          }),
          prisma.scheduledWorkout.findMany({
            where: { userId, scheduledDate: today, status: { in: ["PLANNED", "MOVED"] } },
          }),
          prisma.habitCompletion.findMany({
            where: { userId, date: today },
            select: { habitId: true },
          }),
        ]);

        const completedIds = new Set(completions.map((c) => c.habitId));

        return {
          habits: habits.map((h) => ({
            habitId: h.id,
            title: h.title,
            icon: h.icon,
            duration: h.duration,
            pointsOnComplete: h.pointsOnComplete,
            done: completedIds.has(h.id),
          })),
          scheduledWorkouts: scheduledWorkouts.map((sw) => ({
            scheduledWorkoutId: sw.id,
            name: sw.workoutTypeName ?? "Workout",
            scheduledTime: sw.scheduledTime,
            duration: sw.duration,
            status: sw.status,
          })),
        };
      },
    }),

    get_wearable_data: makeTool({
      description: "Get the user's most recent wearable health data",
      parameters: z.object({}),
      execute: async () => {
        const devices = await prisma.device.findMany({
          where: { userId, connected: true },
          select: { id: true, provider: true },
        });
        if (devices.length === 0) return { connected: false, message: "No wearable devices connected." };

        const deviceIds = devices.map((d) => d.id);
        const rows = await prisma.deviceData.findMany({
          where: { deviceId: { in: deviceIds } },
          orderBy: { date: "desc" },
          take: deviceIds.length * 7,
        });

        let steps: number | null = null;
        let sleepHours: number | null = null;
        let hrv: number | null = null;
        let restingHr: number | null = null;
        let latestDate: string | null = null;

        for (const row of rows) {
          if (steps == null && row.steps != null) steps = row.steps;
          if (sleepHours == null && row.sleepDuration != null) sleepHours = Math.round((row.sleepDuration / 60) * 10) / 10;
          if (hrv == null && row.hrv != null) hrv = row.hrv;
          if (restingHr == null && row.hrResting != null) restingHr = row.hrResting;
          if (latestDate == null) latestDate = row.date;
        }

        return { connected: true, providers: devices.map((d) => d.provider), latestDate, steps, sleepHours, hrv, restingHr };
      },
    }),

    start_timer: makeTool({
      description: "Show a countdown timer (e.g. for rest periods between sets)",
      parameters: z.object({
        durationSec: z.number(),
        label: z.string().optional(),
      }),
      execute: async ({ durationSec, label }) => {
        return { durationSec, label: label ?? "Rest Timer" };
      },
    }),

    show_crisis_resources: makeTool({
      description: "Show crisis support resources — only call when the user expresses crisis-level distress",
      parameters: z.object({ message: z.string().optional() }),
      execute: async ({ message }) => {
        return { message: message ?? "You don't have to face this alone. Support is available right now." };
      },
    }),

    import_workouts_from_screenshot: makeTool({
      description: "Parse and bulk-import past workouts from a screenshot of a booking/reservation app (ClassPass, Mindbody, etc). EVERY visible row is a separate entry — even if two classes share the same date. NEVER merge, skip, or deduplicate entries. CRITICAL: Use the EXACT verbatim class name — never normalize or guess category. 'Hot HIIT Pilates' stays 'Hot HIIT Pilates'. 'Mat Pilates, Hot' stays 'Mat Pilates, Hot'. 'The Stride – Reformer' stays exactly that. Two entries on Mar 24 at 16:10 and 11:40 = two separate objects in the array. Each row = one object, always.",
      parameters: z.object({
        workouts: z.array(z.object({
          date: z.string().describe("ISO date YYYY-MM-DD — infer year from context (screenshots show recent months)"),
          time: z.string().describe("HH:MM 24h format — REQUIRED, read directly from the screenshot (e.g. '16:10', '11:40'). This is what distinguishes two classes on the same day."),
          className: z.string().describe("VERBATIM class name exactly as written — copy character-for-character. 'The Stride – Reformer', 'Mat Pilates, Hot', 'Red Light Therapy Bed', 'Hot HIIT Pilates', 'Reformer Sculpt & Tone Intermediate' etc."),
          instructor: z.string().optional().describe("Instructor name as shown"),
          studio: z.string().optional().describe("Studio/location as shown"),
          status: z.enum(["completed", "cancelled"]).describe("completed = 'Add a review' shown. cancelled = 'Late cancellation' shown."),
          durationMin: z.number().default(45).describe("Class duration in minutes — 45 if not shown"),
        })).min(1),
      }),
      execute: async ({ workouts }) => {
        const results: { date: string; time: string; className: string; status: string; logId?: string }[] = [];

        for (const w of workouts) {
          const dateObj = toDate(w.date);
          if (!isValid(dateObj)) continue;

          // Build startedAt with actual class time so same-day workouts are distinct
          if (w.time) {
            const [hh, mm] = w.time.split(":").map(Number);
            if (!isNaN(hh) && !isNaN(mm)) {
              dateObj.setHours(hh, mm, 0, 0);
            }
          }

          if (w.status === "completed") {
            // ── Deduplication: check ±30 min window for same workout name ──────
            const windowStart = new Date(dateObj.getTime() - 30 * 60 * 1000);
            const windowEnd   = new Date(dateObj.getTime() + 30 * 60 * 1000);
            const existing = await prisma.workoutLog.findFirst({
              where: {
                userId,
                workoutName: w.className,
                startedAt: { gte: windowStart, lte: windowEnd },
              },
            });
            if (existing) {
              results.push({ date: w.date, time: w.time ?? "", className: w.className, status: "duplicate" });
              continue;
            }

            const log = await prisma.workoutLog.create({
              data: {
                userId,
                workoutName: w.className,
                startedAt: dateObj,
                durationMin: w.durationMin ?? 45,
                source: "screenshot_import",
                notes: [w.instructor, w.studio].filter(Boolean).join(" — ") || null,
                xpAwarded: XP.WORKOUT_COMPLETE,
              },
            });
            await prisma.user.update({
              where: { id: userId },
              data: { totalXp: { increment: XP.WORKOUT_COMPLETE } },
            });
            results.push({ date: w.date, time: w.time ?? "", className: w.className, status: "logged", logId: log.id });
          } else {
            // Cancelled — check for duplicate skipped entry too
            const dayStart = toDate(w.date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart.getTime() + 86400000);
            const existingSW = await prisma.scheduledWorkout.findFirst({
              where: {
                userId,
                workoutTypeName: w.className,
                scheduledDate: { gte: dayStart, lt: dayEnd },
                status: "SKIPPED",
              },
            });
            if (existingSW) {
              results.push({ date: w.date, time: w.time ?? "", className: w.className, status: "duplicate" });
              continue;
            }

            await prisma.scheduledWorkout.create({
              data: {
                userId,
                workoutTypeName: w.className,
                scheduledDate: toDate(w.date),
                scheduledTime: w.time ?? null,
                duration: w.durationMin,
                status: "SKIPPED",
                skippedReason: "Late cancellation (imported from screenshot)",
                notes: [w.instructor, w.studio].filter(Boolean).join(" — ") || null,
              },
            });
            results.push({ date: w.date, time: w.time ?? "", className: w.className, status: "skipped" });
          }
        }

        const logged = results.filter((r) => r.status === "logged").length;
        const duplicates = results.filter((r) => r.status === "duplicate").length;

        return {
          imported: logged,
          completed: logged,
          cancelled: results.filter((r) => r.status === "skipped").length,
          duplicates,
          workouts: results,
        };
      },
    }),

    delete_duplicate_workouts: makeTool({
      description: "Find and remove duplicate WorkoutLog entries — workouts with the same name logged within 30 minutes of each other on the same day. Call this when the user reports duplicate workouts, or proactively after any import that found duplicates. Always call this after a screenshot import that returned duplicate entries.",
      parameters: z.object({
        confirm: z.boolean().default(true).describe("Always true — proceed with deletion"),
      }),
      execute: async () => {
        // Find all workout logs for this user, ordered by startedAt
        const logs = await prisma.workoutLog.findMany({
          where: { userId },
          orderBy: { startedAt: "asc" },
          select: { id: true, workoutName: true, startedAt: true },
        });

        const toDelete: string[] = [];
        const seen: { name: string; at: Date }[] = [];

        for (const log of logs) {
          const duplicate = seen.find(
            (s) =>
              s.name === log.workoutName &&
              Math.abs(s.at.getTime() - log.startedAt.getTime()) < 30 * 60 * 1000
          );
          if (duplicate) {
            toDelete.push(log.id);
          } else {
            seen.push({ name: log.workoutName, at: log.startedAt });
          }
        }

        if (toDelete.length > 0) {
          await prisma.workoutLog.deleteMany({ where: { id: { in: toDelete }, userId } });
          // Refund XP for removed duplicates
          await prisma.user.update({
            where: { id: userId },
            data: { totalXp: { decrement: toDelete.length * XP.WORKOUT_COMPLETE } },
          });
        }

        return {
          removed: toDelete.length,
          message: toDelete.length > 0
            ? `Removed ${toDelete.length} duplicate workout${toDelete.length > 1 ? "s" : ""}.`
            : "No duplicates found — your workout history is clean.",
        };
      },
    }),

    show_avatar_snapshot: makeTool({
      description: "Show the user their current avatar or a specific milestone avatar. Call this when the user asks to see their avatar, 'Vita You', or wants to see how they're progressing visually.",
      parameters: z.object({
        milestoneLabel: z.string().optional().describe("Optional: 'today', 'week 4', 'goal day', etc."),
      }),
      execute: async ({ milestoneLabel }) => {
        const avatar = await (prisma as any).avatar.findUnique({ where: { userId } });
        if (!avatar || avatar.visibility === "OFF") {
          return { hidden: true, message: "Your avatar is currently hidden. You can enable it in the Body page." };
        }

        let milestone = null;
        if (milestoneLabel) {
          milestone = await (prisma as any).avatarMilestone.findFirst({
            where: { userId, label: { contains: milestoneLabel, mode: "insensitive" } },
            orderBy: { date: "asc" },
          });
        }

        return {
          hasAvatar: true,
          visibility: avatar.visibility,
          style: avatar.style,
          currentEvolution: (avatar.definition as any)?.evolution ?? 0,
          milestone: milestone ? {
            label: milestone.label,
            date: milestone.date.toISOString().split("T")[0],
            evolution: milestone.evolution,
            note: milestone.note,
          } : null,
          message: milestone
            ? `Here's your avatar at ${milestone.label} — ${milestone.note ?? "keep going."}`
            : "Here's your current avatar — you, as of today.",
          avatarUrl: "/body",
        };
      },
    }),

    create_avatar_event: makeTool({
      description: "Create a 'dress rehearsal' event — a special occasion the user is working toward (wedding, vacation, reunion, photo shoot, etc.). The avatar will be shown in the event outfit on that day.",
      parameters: z.object({
        title: z.string().describe("Event name, e.g. 'Sister's wedding'"),
        date: z.string().describe("YYYY-MM-DD"),
        outfit: z.string().optional().describe("Outfit ID: activewear_set, little_black_dress, swimsuit, wrap_dress, blazer_pants"),
        background: z.string().optional().describe("Background: studio, beach, city, gym, event"),
        note: z.string().optional(),
      }),
      execute: async ({ title, date, outfit, background, note }) => {
        const eventDate = new Date(date + "T00:00:00.000Z");
        if (isNaN(eventDate.getTime())) throw new Error("Invalid date format — use YYYY-MM-DD");

        const event = await (prisma as any).avatarEvent.create({
          data: {
            userId,
            title,
            date: eventDate,
            outfit: outfit ?? "little_black_dress",
            background: background ?? "event",
            pose: "hands_on_hips",
            note: note ?? null,
          },
        });

        return {
          eventId: event.id,
          title: event.title,
          date: date,
          message: `Dress rehearsal set for ${title} on ${date}. Your avatar will show you in that moment. You can see it on your Body page.`,
        };
      },
    }),

    set_safety_flag: makeTool({
      description: "Set a safety flag for sensitive body image topics. Call this immediately if the user expresses discomfort with their body, mentions disordered eating history, or says the avatar feels triggering. This automatically switches to the abstract style and limited visibility.",
      parameters: z.object({
        flag: z.enum(["sensitive_body_image", "disordered_eating_history", "user_requested_abstract"]),
        note: z.string().optional().describe("Brief context for why the flag was set"),
      }),
      execute: async ({ flag, note }) => {
        await (prisma as any).safetyFlag.create({
          data: { userId, flag, setBy: "chat_inference", note: note ?? null },
        });

        await (prisma as any).avatar.upsert({
          where: { userId },
          create: { userId, definition: {}, visibility: "LIMITED", style: "ABSTRACT" },
          update: { visibility: "LIMITED", style: "ABSTRACT" },
        });

        return {
          ok: true,
          message: "I've switched your avatar to the abstract style and moved it to your Body page only. Your comfort matters more than any feature.",
        };
      },
    }),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cadenceStrToEnum(cadence: string) {
  const map: Record<string, "DAILY" | "WEEKLY_N" | "SPECIFIC_DAYS" | "EVERY_OTHER" | "WEEKDAYS" | "WEEKENDS"> = {
    daily: "DAILY",
    weekly_n: "WEEKLY_N",
    "2x/week": "WEEKLY_N",
    "3x/week": "WEEKLY_N",
    "5x/week": "WEEKLY_N",
    specific_days: "SPECIFIC_DAYS",
    every_other: "EVERY_OTHER",
    weekdays: "WEEKDAYS",
    weekends: "WEEKENDS",
    weekly: "WEEKLY_N",
  };
  return map[cadence.toLowerCase()] ?? "DAILY";
}

function inferUnit(kind: string): string {
  if (kind.endsWith("_kg")) return "kg";
  if (kind.endsWith("_cm")) return "cm";
  if (kind.endsWith("_pct")) return "%";
  if (kind.includes("weight")) return "kg";
  if (kind.includes("hr") || kind.includes("heart")) return "bpm";
  return "cm";
}

/** Spread N workouts across 7 weekdays as evenly as possible, starting Monday. */
function spreadDaysInWeek(count: number): number[] {
  if (count <= 0) return [];
  if (count >= 7) return [0, 1, 2, 3, 4, 5, 6];
  const gap = Math.floor(7 / count);
  const days: number[] = [];
  for (let i = 0; i < count; i++) {
    days.push((i * gap) % 7);
  }
  return days.sort((a, b) => a - b);
}
