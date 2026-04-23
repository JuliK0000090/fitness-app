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
            title: "Still time today",
            body: `Hey ${user.name ?? "there"}, you haven't logged a workout yet today. Even 20 minutes counts — tell Vita what you did.`,
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
        const allDone = total > 0 && done === total;

        const body = workouts.length > 0
          ? allDone
            ? `Strong day — workout logged and every habit done. That's the kind of consistency that moves the needle.`
            : `Workout logged. ${total > 0 ? `${done}/${total} habits done.` : ""} Open Vita to wrap up the day.`
          : total > 0 && done > 0
            ? `${done}/${total} habits checked off. No workout today — that's fine, rest is part of the plan.`
            : `How did today feel? Open Vita and let her know — even a short check-in keeps momentum going.`;

        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "evening_reflection",
            title: "End of day",
            body,
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
        const [workouts, goals, recentMeasurements, prevMeasurements] = await Promise.all([
          prisma.workoutLog.findMany({
            where: { userId: user.id, startedAt: { gte: weekStart } },
          }),
          prisma.goal.findMany({
            where: { userId: user.id, status: "active" },
            select: { title: true, targetMetric: true, targetValue: true, currentValue: true, unit: true, deadline: true, predictedHitDate: true },
            take: 5,
          }),
          // Most recent measurement per kind (this week)
          prisma.measurement.findMany({
            where: { userId: user.id, capturedAt: { gte: weekStart } },
            orderBy: { capturedAt: "desc" },
            take: 10,
          }),
          // Same metric from 4 weeks ago for delta comparison
          prisma.measurement.findMany({
            where: { userId: user.id, capturedAt: { gte: new Date(weekStart.getTime() - 28 * 86400000), lt: weekStart } },
            orderBy: { capturedAt: "desc" },
            take: 10,
          }),
        ]);

        // Build outcome deltas (e.g. "weight: -0.8 kg in 4 weeks")
        const deltaLines: string[] = [];
        for (const m of recentMeasurements) {
          const prev = prevMeasurements.find((p) => p.kind === m.kind);
          if (prev) {
            const delta = m.value - prev.value;
            const sign = delta > 0 ? "+" : "";
            deltaLines.push(`${m.kind}: ${sign}${delta.toFixed(1)} ${m.unit ?? ""} over 4 weeks (now ${m.value} ${m.unit ?? ""})`);
          }
        }

        // Goal trajectory lines
        const goalLines = goals.map((g) => {
          const parts = [g.title];
          if (g.currentValue != null && g.targetValue != null) parts.push(`${g.currentValue} → ${g.targetValue} ${g.unit ?? ""}`);
          if (g.predictedHitDate) parts.push(`on track for ${new Date(g.predictedHitDate).toDateString()}`);
          if (g.deadline && g.predictedHitDate && new Date(g.predictedHitDate) > new Date(g.deadline)) parts.push("behind schedule");
          return parts.join(", ");
        });

        const systemPrompt = buildSystemPrompt({
          userName: user.name ?? "there",
          customInstructions: user.customInstructions ?? undefined,
          customResponseStyle: user.customResponseStyle ?? undefined,
          profileContext: [
            `Workouts this week: ${workouts.length}.`,
            deltaLines.length > 0 ? `Body measurement changes:\n${deltaLines.join("\n")}` : "",
            goalLines.length > 0 ? `Active goals:\n${goalLines.join("\n")}` : "",
          ].filter(Boolean).join("\n"),
        });

        const { text } = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          system: systemPrompt,
          prompt: `Write a 2-3 sentence weekly review. Lead with a concrete outcome if available (e.g. body measurement change, goal progress percentage). Be honest but warm. End with one specific action for next week. Never use markdown tables or emoji.`,
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
