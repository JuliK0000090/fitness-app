/**
 * Claude critique pass — a subjective safety net that runs alongside the
 * mechanical validator. Used by multi-day plan generation paths where the
 * mechanical rules pass but the schedule may still feel wrong (e.g., 4
 * sessions a day, no rest blocks, all heated work mid-cycle).
 *
 * Single-workout chat tool calls do NOT use this — the mechanical validator
 * is enough and the latency isn't worth it.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { PlannerConstraint, ScheduledWorkout } from "@prisma/client";
import { prisma } from "../prisma";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type CritiqueResult = {
  ok: boolean;
  issues: string[];
};

export async function critiqueWeekPlan(
  workouts: ScheduledWorkout[],
  userId: string,
): Promise<CritiqueResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    // No API key in dev — skip critique gracefully.
    return { ok: true, issues: [] };
  }
  if (workouts.length === 0) return { ok: true, issues: [] };

  const constraints = await prisma.plannerConstraint.findMany({
    where: { userId, active: true },
  });
  const constraintLines = constraints.length === 0
    ? "(none)"
    : constraints.map((c: PlannerConstraint) =>
        `- ${c.reason} (${c.startDate.toISOString().split("T")[0]} to ${c.endDate ? c.endDate.toISOString().split("T")[0] : "indefinite"})`,
      ).join("\n");

  const planLines = workouts
    .slice()
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
    .map((w) => {
      const date = w.scheduledDate.toISOString().split("T")[0];
      return `- ${date} ${w.scheduledTime ?? "any"} ${w.workoutTypeName ?? "workout"} (${w.duration}min, intensity ${w.intensity ?? "?"})`;
    })
    .join("\n");

  const prompt = `Review this multi-day workout plan for an accomplished athletic woman pursuing body-composition + lifestyle goals. Be brutal — if anything is off, return ok=false.

Plan:
${planLines}

Active constraints:
${constraintLines}

Check for:
1. Duplicates (same workout type twice on the same day)
2. More than 2 workouts on any single day
3. More than 1 heated class on any single day
4. Conflicts with stated constraints
5. Two intense sessions less than 4h apart
6. No rest blocks across multiple consecutive intense days
7. The plan generally "feels wrong" — e.g. all heated mid-week, no recovery, monotonous

Return strict JSON only, no prose:
{ "ok": true | false, "issues": ["specific issue 1", "specific issue 2"] }`;

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      temperature: 0.2,
    });
    const json = extractJson(text);
    if (!json) return { ok: true, issues: [] }; // model gave non-JSON, don't block
    return {
      ok: !!json.ok,
      issues: Array.isArray(json.issues) ? json.issues.map(String) : [],
    };
  } catch (e) {
    console.error("[critique] LLM call failed:", e);
    return { ok: true, issues: [] };
  }
}

function extractJson(s: string): { ok: boolean; issues: unknown[] } | null {
  // Find the first {...} block.
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}
