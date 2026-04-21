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

    get_wearable_data: makeTool({
      description: "Get the user's most recent wearable health data across all connected devices. Returns a summary including steps, sleep hours, HRV, and resting heart rate.",
      parameters: z.object({}),
      execute: async () => {
        // Find all connected devices for the user
        const devices = await prisma.device.findMany({
          where: { userId, connected: true },
          select: { id: true, provider: true },
        });

        if (devices.length === 0) {
          return { connected: false, message: "No wearable devices connected." };
        }

        // Get the most recent DeviceData entry per device
        const deviceIds = devices.map((d) => d.id);
        const rows = await prisma.deviceData.findMany({
          where: { deviceId: { in: deviceIds } },
          orderBy: { date: "desc" },
          take: deviceIds.length * 7, // up to 7 days per device
        });

        // Aggregate: use the most recent non-null value for each metric
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

        return {
          connected: true,
          providers: devices.map((d) => d.provider),
          latestDate,
          steps,
          sleepHours,
          hrv,
          restingHr,
        };
      },
    }),

    list_integrations: makeTool({
      description: "List all connected wearable devices for the user.",
      parameters: z.object({}),
      execute: async () => {
        const devices = await prisma.device.findMany({
          where: { userId },
          select: {
            id: true,
            provider: true,
            connected: true,
            connectedAt: true,
            lastSyncAt: true,
          },
          orderBy: { connectedAt: "desc" },
        });
        return { devices };
      },
    }),

    show_form_check: makeTool({
      description: "Open the live camera form check overlay so the user can check their exercise form with a rep counter.",
      parameters: z.object({
        exercise: z.string().optional().describe("The exercise to check (e.g. 'Squat', 'Push-up')"),
      }),
      execute: async ({ exercise }) => {
        return { action: "open_form_check", exercise: exercise ?? "Squat" };
      },
    }),

    estimate_body_measurements: makeTool({
      description: "Open the photo measurement tool so the user can estimate body measurements from a photo.",
      parameters: z.object({}),
      execute: async () => {
        return { action: "open_photo_measure" };
      },
    }),

    start_timer: makeTool({
      description: "Show a countdown timer (e.g. for rest periods between sets).",
      parameters: z.object({
        durationSec: z.number().describe("Timer duration in seconds"),
        label: z.string().optional().describe("Label for the timer (e.g. 'Rest Timer')"),
      }),
      execute: async ({ durationSec, label }) => {
        return { durationSec, label: label ?? "Rest Timer" };
      },
    }),

    get_today_signals: makeTool({
      description: "Get today's health signals (steps, sleep, HRV, heart rate, etc.) for the user",
      parameters: z.object({}),
      execute: async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const rows = await prisma.healthDaily.findMany({
          where: { userId, date: today },
        });
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const sleepRows = await prisma.healthDaily.findMany({
          where: { userId, date: yesterday, metric: { in: ["sleepHours", "hrvMs", "restingHr"] } },
        });
        return [...rows, ...sleepRows].map(r => ({
          metric: r.metric, value: r.value, unit: r.unit, source: r.source, trust: r.trust,
        }));
      },
    }),

    get_health_trend: makeTool({
      description: "Get trend data for a specific health metric over recent days",
      parameters: z.object({
        metric: z.string().describe("Metric name: steps, sleepHours, hrvMs, restingHr, weightKg, etc."),
        days: z.number().default(7).describe("Number of days to look back"),
      }),
      execute: async ({ metric, days }) => {
        const since = new Date();
        since.setDate(since.getDate() - (days ?? 7));
        const rows = await prisma.healthDaily.findMany({
          where: { userId, metric, date: { gte: since } },
          orderBy: { date: "asc" },
        });
        return rows.map(r => ({ date: r.date.toISOString().split("T")[0], value: r.value, source: r.source, trust: r.trust }));
      },
    }),

    override_health_metric: makeTool({
      description: "Override a health metric for a specific date with a user-provided value",
      parameters: z.object({
        date: z.string().describe("Date in YYYY-MM-DD format"),
        metric: z.string().describe("Metric to override"),
        value: z.number().describe("The correct value"),
        note: z.string().optional().describe("Reason for override"),
      }),
      execute: async ({ date, metric, value, note }) => {
        const d = new Date(date);
        await prisma.healthOverride.upsert({
          where: { userId_date_metric: { userId, date: d, metric } },
          create: { userId, date: d, metric, value, note },
          update: { value, note },
        });
        await prisma.healthDaily.upsert({
          where: { userId_date_metric: { userId, date: d, metric } },
          create: { userId, date: d, metric, value, unit: "", source: "MANUAL", sources: {}, trust: 100, overridden: true },
          update: { value, source: "MANUAL", overridden: true, trust: 100 },
        });
        return { ok: true, message: `Override saved: ${value} ${metric} on ${date}` };
      },
    }),
  };
}
