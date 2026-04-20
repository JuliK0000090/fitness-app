import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Morning briefing (7:00 AM UTC daily) ────────────────────────────────────
export const morningBriefing = inngest.createFunction(
  {
    id: "morning-briefing",
    triggers: [{ cron: "0 7 * * *" }],
  },
  async ({ step }: { step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const users = await step.run("fetch-active-users", async () => {
      return prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true, name: true, customInstructions: true, customResponseStyle: true },
      });
    });

    for (const user of users) {
      await step.run(`briefing-${user.id}`, async () => {
        const [goals, checklist, measurements] = await Promise.all([
          prisma.goal.findMany({ where: { userId: user.id, status: "active" }, take: 3 }),
          prisma.checklistItem.findMany({
            where: { userId: user.id, date: new Date().toISOString().split("T")[0] },
          }),
          prisma.measurement.findMany({
            where: { userId: user.id },
            orderBy: { capturedAt: "desc" },
            take: 5,
          }),
        ]);

        const profileContext = `Goals: ${JSON.stringify(goals)}. Recent measurements: ${JSON.stringify(measurements)}`;
        const systemPrompt = buildSystemPrompt({
          userName: user.name ?? "there",
          customInstructions: user.customInstructions ?? undefined,
          customResponseStyle: user.customResponseStyle ?? undefined,
          profileContext,
        });

        const { text } = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          system: systemPrompt,
          prompt: `Generate a short, motivating morning briefing for today. Mention what's on the checklist (${checklist.length} items), any active goals, and one actionable tip. Keep it under 120 words. Be warm and personal.`,
          maxTokens: 200,
        });

        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "morning_briefing",
            title: "Good morning!",
            body: text,
          },
        });
      });
    }

    return { processed: users.length };
  }
);

// ─── Nudge (2:00 PM UTC — check if workout done) ─────────────────────────────
export const afternoonNudge = inngest.createFunction(
  {
    id: "afternoon-nudge",
    triggers: [{ cron: "0 14 * * *" }],
  },
  async ({ step }: { step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const today = new Date().toISOString().split("T")[0];

    const users = await step.run("fetch-users-no-workout", async () => {
      const usersWithWorkout = await prisma.workoutLog.findMany({
        where: { startedAt: { gte: new Date(today) } },
        select: { userId: true },
        distinct: ["userId"],
      });
      const excludeIds = usersWithWorkout.map((u) => u.userId);

      return prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true, id: { notIn: excludeIds } },
        select: { id: true, name: true },
      });
    });

    for (const user of users) {
      await step.run(`nudge-${user.id}`, async () => {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "nudge",
            title: "Don't break your streak!",
            body: `Hey ${user.name ?? "there"}, you haven't logged a workout yet today. Even 20 minutes counts — tell Vita what you did!`,
          },
        });
      });
    }

    return { nudged: users.length };
  }
);

// ─── Evening reflection (9:00 PM UTC) ────────────────────────────────────────
export const eveningReflection = inngest.createFunction(
  {
    id: "evening-reflection",
    triggers: [{ cron: "0 21 * * *" }],
  },
  async ({ step }: { step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const today = new Date().toISOString().split("T")[0];

    const users = await step.run("fetch-active-users", async () => {
      return prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true, name: true },
      });
    });

    for (const user of users) {
      await step.run(`reflection-${user.id}`, async () => {
        const [workouts, checklist] = await Promise.all([
          prisma.workoutLog.findMany({
            where: { userId: user.id, startedAt: { gte: new Date(today) } },
            take: 5,
          }),
          prisma.checklistItem.findMany({
            where: { userId: user.id, date: today },
          }),
        ]);

        const done = checklist.filter((c) => c.doneAt).length;
        const total = checklist.length;

        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "evening_reflection",
            title: "How did today go?",
            body: `You completed ${done}/${total} checklist items and logged ${workouts.length} workout(s). Open Vita to reflect on your day.`,
          },
        });
      });
    }

    return { processed: users.length };
  }
);

// ─── Weekly review generator (Sunday 8:00 PM UTC) ────────────────────────────
export const weeklyReviewJob = inngest.createFunction(
  {
    id: "weekly-review",
    triggers: [{ cron: "0 20 * * 0" }],
  },
  async ({ step }: { step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const users = await step.run("fetch-active-users", async () => {
      return prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true, name: true, customInstructions: true, customResponseStyle: true },
      });
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    for (const user of users) {
      await step.run(`weekly-review-${user.id}`, async () => {
        const [workouts, goals, measurements] = await Promise.all([
          prisma.workoutLog.findMany({
            where: { userId: user.id, startedAt: { gte: weekStart } },
          }),
          prisma.goal.findMany({ where: { userId: user.id, status: "active" }, take: 5 }),
          prisma.measurement.findMany({
            where: { userId: user.id, capturedAt: { gte: weekStart } },
          }),
        ]);

        const systemPrompt = buildSystemPrompt({
          userName: user.name ?? "there",
          customInstructions: user.customInstructions ?? undefined,
          customResponseStyle: user.customResponseStyle ?? undefined,
          profileContext: `Workouts this week: ${workouts.length}. Active goals: ${goals.length}. Measurements logged: ${measurements.length}.`,
        });

        const { text } = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          system: systemPrompt,
          prompt: `Write a 2-3 sentence motivating weekly review summary. ${workouts.length} workouts logged this week. Be encouraging but honest. End with one specific action for next week.`,
          maxTokens: 200,
        });

        const weekOf = weekStart.toISOString().split("T")[0];

        const existing = await prisma.weeklyReview.findFirst({
          where: { userId: user.id, weekStart },
        });

        if (!existing) {
          await prisma.weeklyReview.create({
            data: {
              userId: user.id,
              weekStart,
              weekOf,
              workoutsCompleted: workouts.length,
              workoutsPlanned: 3,
              adherencePct: workouts.length >= 3 ? 100 : (workouts.length / 3) * 100,
              aiSummary: text,
            },
          });
        }

        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "weekly_review",
            title: "Your weekly review is ready",
            body: text.slice(0, 120) + (text.length > 120 ? "…" : ""),
          },
        });
      });
    }

    return { processed: users.length };
  }
);

// ─── On-demand: generate checklist for today ─────────────────────────────────
export const generateChecklist = inngest.createFunction(
  {
    id: "generate-checklist",
    triggers: [{ event: "vita/checklist.generate" }],
  },
  async ({
    event,
    step,
  }: {
    event: { data: { userId: string } };
    step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> };
  }) => {
    const { userId } = event.data;
    const today = new Date().toISOString().split("T")[0];

    const existing = await step.run("check-existing", async () => {
      return prisma.checklistItem.count({ where: { userId, date: today } });
    });

    if (existing > 0) return { skipped: true };

    const [user, goals, recentWorkouts] = await step.run("fetch-context", async () => {
      return Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: userId } }),
        prisma.goal.findMany({ where: { userId, status: "active" }, take: 3 }),
        prisma.workoutLog.findMany({
          where: { userId },
          orderBy: { startedAt: "desc" },
          take: 5,
        }),
      ]);
    });

    const systemPrompt = buildSystemPrompt({
      userName: user.name ?? "there",
      profileContext: `Goals: ${goals.map((g) => g.description).join(", ")}. Recent workouts: ${recentWorkouts.length}.`,
    });

    const { text } = await step.run("generate-items", async () => {
      return generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        system: systemPrompt,
        prompt: `Generate exactly 5 actionable checklist items for today as JSON array of strings. Consider the user's goals and recent activity. Be specific and achievable. Reply with only valid JSON like: ["item1","item2","item3","item4","item5"]`,
        maxTokens: 200,
      });
    });

    const items: string[] = await step.run("parse-and-save", async () => {
      try {
        const parsed = JSON.parse(text.trim());
        if (!Array.isArray(parsed)) return [];

        await prisma.checklistItem.createMany({
          data: parsed.slice(0, 5).map((desc: string) => ({
            userId,
            date: today,
            description: String(desc).slice(0, 200),
          })),
        });

        return parsed;
      } catch {
        return [];
      }
    });

    return { created: items.length };
  }
);

export const coachingFunctions = [
  morningBriefing,
  afternoonNudge,
  eveningReflection,
  weeklyReviewJob,
  generateChecklist,
];
