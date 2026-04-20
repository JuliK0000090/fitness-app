import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { buildSystemPrompt } from "@/lib/system-prompt";

export async function POST() {
  const session = await requireSession();
  const userId = session.userId;

  // If Inngest is configured, delegate to it (async)
  if (process.env.INNGEST_EVENT_KEY) {
    await inngest.send({ name: "vita/checklist.generate", data: { userId } });
    return NextResponse.json({ ok: true });
  }

  // Fallback: generate directly (synchronous, for local dev without Inngest)
  const today = new Date().toISOString().split("T")[0];

  const existing = await prisma.checklistItem.count({ where: { userId, date: today } });
  if (existing > 0) return NextResponse.json({ ok: true, skipped: true });

  const [user, goals, recentWorkouts] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.goal.findMany({ where: { userId, status: "active" }, take: 3 }),
    prisma.workoutLog.findMany({ where: { userId }, orderBy: { startedAt: "desc" }, take: 5 }),
  ]);

  try {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const systemPrompt = buildSystemPrompt({
      userName: user.name ?? "there",
      profileContext: `Goals: ${goals.map((g) => g.description).join(", ")}. Recent workouts: ${recentWorkouts.length}.`,
    });

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: systemPrompt,
      prompt: `Generate exactly 5 actionable checklist items for today as JSON array of strings. Consider the user's goals and recent activity. Be specific and achievable. Reply with only valid JSON like: ["item1","item2","item3","item4","item5"]`,
      maxTokens: 200,
    });

    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) {
      await prisma.checklistItem.createMany({
        data: parsed.slice(0, 5).map((desc: string) => ({
          userId,
          date: today,
          description: String(desc).slice(0, 200),
        })),
      });
    }
  } catch {
    // Non-fatal — return ok even if generation fails
  }

  return NextResponse.json({ ok: true });
}
