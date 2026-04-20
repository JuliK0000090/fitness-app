import { z } from "zod";
import { prisma } from "./prisma";
import { parseGoalFromNL, generateWeeklyPlan, predictHitDate } from "./goal-engine";

// ─── Helper ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split("T")[0];
}

// Define tool shape compatible with AI SDK v4
function makeTool<TInput, TOutput>(config: {
  description: string;
  parameters: z.ZodType<TInput>;
  execute: (input: TInput) => Promise<TOutput>;
}) {
  return config;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

export function vitaTools(userId: string) {
  return {
    get_profile: makeTool({
      description: "Get the user's current profile including latest weight",
      parameters: z.object({}),
      execute: async () => {
        const user = await prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: { id: true, name: true, dob: true, sex: true, heightCm: true, activityLevel: true, medicalNotes: true, goalWeightKg: true },
        });
        const latestWeight = await prisma.measurement.findFirst({
          where: { userId, kind: "weight" }, orderBy: { capturedAt: "desc" },
        });
        return { ...user, currentWeightKg: latestWeight?.value ?? null };
      },
    }),

    update_profile: makeTool({
      description: "Update the user's profile fields",
      parameters: z.object({
        name: z.string().optional(),
        heightCm: z.number().optional(),
        sex: z.string().optional(),
        activityLevel: z.string().optional(),
        goalWeightKg: z.number().optional(),
        medicalNotes: z.string().optional(),
      }),
      execute: async (input) => {
        await prisma.user.update({ where: { id: userId }, data: input });
        return { ok: true };
      },
    }),

    add_goal: makeTool({
      description: "Add a new fitness goal",
      parameters: z.object({
        description: z.string(),
        bodyArea: z.string().optional(),
        direction: z.enum(["increase", "decrease", "maintain", "achieve"]),
        magnitude: z.number().optional(),
        unit: z.string().optional(),
        deadline: z.string().optional(),
      }),
      execute: async (input) => {
        const goal = await prisma.goal.create({
          data: { ...input, userId, deadline: input.deadline ? new Date(input.deadline) : undefined },
        });
        return { goalId: goal.id, description: goal.description, status: goal.status };
      },
    }),

    list_goals: makeTool({
      description: "List goals",
      parameters: z.object({ status: z.string().optional() }),
      execute: async ({ status }) => {
        return prisma.goal.findMany({
          where: { userId, status: status ?? "active" },
          orderBy: { createdAt: "desc" },
        });
      },
    }),

    update_goal: makeTool({
      description: "Update a goal's status or description",
      parameters: z.object({
        goalId: z.string(),
        status: z.enum(["active", "achieved", "paused", "cancelled"]).optional(),
        description: z.string().optional(),
      }),
      execute: async ({ goalId, ...data }) => {
        await prisma.goal.update({ where: { id: goalId, userId }, data });
        return { ok: true };
      },
    }),

    add_habit: makeTool({
      description: "Add a recurring habit",
      parameters: z.object({
        description: z.string(),
        cadence: z.enum(["daily", "weekly", "2x/week", "3x/week", "5x/week"]),
      }),
      execute: async (input) => {
        const targetMap: Record<string, number> = { daily: 7, weekly: 1, "2x/week": 2, "3x/week": 3, "5x/week": 5 };
        const habit = await prisma.habit.create({
          data: { ...input, userId, targetPerWeek: targetMap[input.cadence] ?? 1 },
        });
        return { habitId: habit.id };
      },
    }),

    list_habits: makeTool({
      description: "List active habits",
      parameters: z.object({}),
      execute: async () => prisma.habit.findMany({ where: { userId, active: true } }),
    }),

    log_workout: makeTool({
      description: "Log a completed workout session",
      parameters: z.object({
        workoutName: z.string(),
        durationMin: z.number(),
        intensity: z.number().min(1).max(10).optional(),
        caloriesEst: z.number().optional(),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        const log = await prisma.workoutLog.create({ data: { ...input, userId } });
        return { workoutId: log.id, workoutName: log.workoutName, durationMin: log.durationMin, xpAwarded: log.xpAwarded };
      },
    }),

    list_workouts: makeTool({
      description: "List recent workout logs",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit }) => {
        return prisma.workoutLog.findMany({
          where: { userId }, orderBy: { startedAt: "desc" }, take: limit ?? 10,
        });
      },
    }),

    log_measurement: makeTool({
      description: "Log a body measurement",
      parameters: z.object({
        kind: z.enum(["weight", "waist", "hips", "bust", "thigh_l", "thigh_r", "glute", "bicep_l", "bicep_r"]),
        value: z.number(),
        unit: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        const m = await prisma.measurement.create({ data: { ...input, userId } });
        return { measurementId: m.id, kind: m.kind, value: m.value, unit: m.unit };
      },
    }),

    list_measurements: makeTool({
      description: "List measurements, optionally filtered by kind",
      parameters: z.object({ kind: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ kind, limit }) => {
        return prisma.measurement.findMany({
          where: { userId, ...(kind ? { kind } : {}) },
          orderBy: { capturedAt: "desc" },
          take: limit ?? 20,
        });
      },
    }),

    get_todays_checklist: makeTool({
      description: "Get today's checklist items",
      parameters: z.object({}),
      execute: async () => {
        return prisma.checklistItem.findMany({
          where: { userId, date: today() },
          orderBy: { createdAt: "asc" },
        });
      },
    }),

    complete_checklist_item: makeTool({
      description: "Mark a checklist item as done",
      parameters: z.object({ itemId: z.string() }),
      execute: async ({ itemId }) => {
        await prisma.checklistItem.update({
          where: { id: itemId, userId },
          data: { doneAt: new Date() },
        });
        return { ok: true };
      },
    }),

    get_xp: makeTool({
      description: "Get the user's current XP and level",
      parameters: z.object({}),
      execute: async () => {
        const [workouts, measurements, goals, checklist] = await Promise.all([
          prisma.workoutLog.count({ where: { userId } }),
          prisma.measurement.count({ where: { userId } }),
          prisma.goal.count({ where: { userId, status: "achieved" } }),
          prisma.checklistItem.findMany({ where: { userId }, select: { doneAt: true } }),
        ]);
        const total = workouts * 25 + measurements * 10 + goals * 150 +
          (checklist.length > 0 ? Math.round((checklist.filter((c) => c.doneAt).length / checklist.length) * 100) : 0);
        const levels = [0, 200, 500, 1000, 2000, 4000, Infinity];
        const levelIdx = levels.findIndex((_, i) => total < levels[i + 1]);
        return {
          totalXp: total, level: levelIdx + 1,
          xpForNext: levels[levelIdx + 1] === Infinity ? null : levels[levelIdx + 1],
          xpInLevel: total - levels[levelIdx],
        };
      },
    }),

    parse_goal: makeTool({
      description: "Parse a natural language goal description into structured goal data",
      parameters: z.object({ text: z.string() }),
      execute: async ({ text }) => {
        return parseGoalFromNL(text);
      },
    }),

    generate_weekly_plan: makeTool({
      description: "Generate a personalized 7-day workout plan based on the user's goals and history",
      parameters: z.object({}),
      execute: async () => {
        return generateWeeklyPlan(userId);
      },
    }),

    predict_goal_date: makeTool({
      description: "Predict when a goal will be reached based on measurement trends",
      parameters: z.object({ goalId: z.string() }),
      execute: async ({ goalId }) => {
        const date = await predictHitDate(userId, goalId);
        return { predictedDate: date ? date.toISOString() : null };
      },
    }),
  };
}
