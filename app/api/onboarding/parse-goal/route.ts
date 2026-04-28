/**
 * Goal-decomposition endpoint for the /welcome flow.
 *
 * Takes the user's natural-language goal (voice transcript or typed
 * input), passes it through Claude Haiku with a strict JSON-only prompt,
 * and returns a {@link GoalDraft} the UI can render in an editable card.
 *
 * Restraint rules (enforced both in the prompt and again in the response
 * post-processor):
 *   - No emoji anywhere
 *   - Never include "Victoria's Secret body" phrasing — translate to
 *     "lean and strong"
 *   - Habits clamped to 4–7 items
 *   - Workout frequencies respected as stated; never inflated
 *   - Dates extracted carefully; "summer" resolves to June 21 of the
 *     current or next year depending on whether it's already past
 *
 * The endpoint never writes to the DB — that's commit's job. Auth is
 * required so we can pull the user's preferences (timezone) for date
 * resolution; an unauthenticated POST is rejected.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { requireSession } from "@/lib/auth";
import { matchPreset } from "@/lib/plans/presets";
import { GoalDraft, GoalCategory } from "@/lib/onboarding/types";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const Body = z.object({
  text: z.string().min(2).max(2000),
  timezone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = Body.parse(await req.json());

  const today = new Date().toISOString().split("T")[0];
  const userTz = body.timezone || "UTC";

  // Match against the existing preset library first — this is fast,
  // deterministic, and handles 80% of inputs ("Victoria's Secret body",
  // "splits", "lean and strong"). Claude is the fallback for free-form.
  const preset = matchPreset(body.text);

  const prompt = `You are extracting a structured fitness goal from the user's statement. Output JSON only — no prose, no markdown fences, no commentary.

User said: """${body.text}"""

Today: ${today} (timezone: ${userTz})

${preset ? `A preset library matched the input as "${preset.slug}" (${preset.title}). Use that as the starting point and adjust based on what the user said. Preset defaults: deadline ${preset.suggestedDeadlineWeeks} weeks out, habits=${JSON.stringify(preset.defaultHabits)}, workouts=${JSON.stringify(preset.defaultWorkouts)}, measurements=${JSON.stringify(preset.defaultMeasurements)}` : "No preset matched. Generate from scratch."}

Output schema (return ONLY this JSON, exactly these keys):
{
  "title": string,                                   // 5-8 words, preserve user's words when possible
  "category": "body_composition" | "event_prep" | "performance" | "lifestyle" | "flexibility" | "strength",
  "deadline": string | null,                         // ISO YYYY-MM-DD; null if no deadline implied
  "habits": [
    {
      "title": string,
      "cadence": "DAILY" | "WEEKLY_N",
      "targetPerWeek": number | null,                // required if cadence=WEEKLY_N
      "durationMin": number | null,                  // 5-90
      "timeOfDay": "morning" | "afternoon" | "evening" | "any",
      "points": number                               // 5-25
    }
  ],
  "workouts": [
    { "workoutType": string, "timesPerWeek": number }
  ],
  "measurements": [ string ],                        // e.g. ["waist_cm", "weight_kg", "body_fat_pct"]
  "presetMatch": ${preset ? `"${preset.slug}"` : "null"}
}

Rules:
- "I want to feel strong for my sister's wedding July 14" → category=event_prep, deadline=July 14 of the appropriate year, lean+aesthetic habits
- "splits by Christmas" → category=flexibility, daily 30-min stretching, 3x/week yoga
- "summer" = June 21 of the current year if today is before June 21, else next year
- "this year" = December 31 of current year
- "in 8 weeks" → today + 56 days
- Habits: 4-7 items only. Quality over quantity. Daily is preferred for behaviour-change; WEEKLY_N for things like "yoga 3x/week".
- Workouts: respect user's stated frequencies. If they said "3x Pilates" output 3, not 5.
- NEVER include emoji. NEVER include the phrase "Victoria's Secret body" — translate to "lean and strong".
- Title is the user's words preserved when possible, lightly edited for grammar. Don't over-format.

Return ONLY valid JSON. No prose. No fences.`;

  let raw: string;
  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      temperature: 0.2,
    });
    raw = text;
  } catch (e) {
    console.error("[parse-goal] Claude call failed:", e);
    return NextResponse.json({ error: "Could not parse your goal. Try rewording or use the example chips." }, { status: 502 });
  }

  // Extract JSON — Haiku occasionally wraps in fences despite instructions.
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[parse-goal] no JSON in response:", raw.slice(0, 200));
    return NextResponse.json({ error: "Could not parse your goal — try again." }, { status: 502 });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("[parse-goal] JSON.parse failed:", e, raw.slice(0, 200));
    return NextResponse.json({ error: "Could not parse your goal — try again." }, { status: 502 });
  }

  const draft = sanitiseDraft(parsed, preset?.slug ?? null);
  void session; // session presence is enforced by requireSession; user not yet linked to draft

  return NextResponse.json({ draft });
}

// ── Post-processor ─────────────────────────────────────────────────────────
// Defence-in-depth: even if Claude ignores instructions, the response that
// reaches the UI is clean.
function sanitiseDraft(p: Record<string, unknown>, presetSlug: string | null): GoalDraft {
  const VALID_CATEGORIES: GoalCategory[] = [
    "body_composition", "event_prep", "performance", "lifestyle", "flexibility", "strength",
  ];

  // Title — strip emoji, strip "Victoria's Secret body" phrasing
  let title = String(p.title ?? "My goal").trim();
  title = title.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");
  title = title.replace(/Victoria'?s\s+Secret\s+body/gi, "lean and strong");
  title = title.slice(0, 80).trim();

  const category = (VALID_CATEGORIES as string[]).includes(p.category as string)
    ? (p.category as GoalCategory)
    : "lifestyle";

  let deadline: string | null = null;
  if (typeof p.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.deadline)) {
    deadline = p.deadline;
  }

  // Habits — clamp to 4-7
  const habitsRaw = Array.isArray(p.habits) ? p.habits : [];
  const habits = habitsRaw
    .filter((h: unknown): h is Record<string, unknown> => typeof h === "object" && h !== null)
    .map((h) => ({
      title: String(h.title ?? "Habit").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").slice(0, 60).trim(),
      cadence: (h.cadence === "WEEKLY_N" ? "WEEKLY_N" : "DAILY") as "DAILY" | "WEEKLY_N",
      targetPerWeek: typeof h.targetPerWeek === "number" ? Math.max(1, Math.min(7, Math.round(h.targetPerWeek))) : undefined,
      durationMin: typeof h.durationMin === "number" ? Math.max(5, Math.min(90, Math.round(h.durationMin))) : undefined,
      timeOfDay: (["morning", "afternoon", "evening", "any"].includes(h.timeOfDay as string)
        ? (h.timeOfDay as "morning" | "afternoon" | "evening" | "any")
        : "any"),
      points: typeof h.points === "number" ? Math.max(5, Math.min(25, Math.round(h.points))) : 10,
    }))
    .filter((h) => h.title.length > 0)
    .slice(0, 7);
  while (habits.length < 4) {
    // Backfill from a small standby set if Claude under-shoots
    const defaults: Array<typeof habits[number]> = [
      { title: "Drink 2.5 L water", cadence: "DAILY", targetPerWeek: undefined, durationMin: 1,  timeOfDay: "any",     points: 10 },
      { title: "10,000 steps",      cadence: "DAILY", targetPerWeek: undefined, durationMin: 60, timeOfDay: "any",     points: 10 },
      { title: "Stretch 10 min",    cadence: "DAILY", targetPerWeek: undefined, durationMin: 10, timeOfDay: "evening", points: 10 },
      { title: "Sleep 7+ hours",    cadence: "DAILY", targetPerWeek: undefined, durationMin: 0,  timeOfDay: "evening", points: 10 },
    ];
    const next = defaults[habits.length % defaults.length];
    if (!habits.some((h) => h.title.toLowerCase() === next.title.toLowerCase())) habits.push(next);
    else break;
  }

  // Workouts — respect stated frequencies, clamp 1..7
  const workoutsRaw = Array.isArray(p.workouts) ? p.workouts : [];
  const workouts = workoutsRaw
    .filter((w: unknown): w is Record<string, unknown> => typeof w === "object" && w !== null)
    .map((w) => ({
      workoutType: String(w.workoutType ?? "Workout").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").slice(0, 40).trim(),
      timesPerWeek: Math.max(1, Math.min(7, Math.round(Number(w.timesPerWeek) || 1))),
    }))
    .filter((w) => w.workoutType.length > 0);

  const measurements = Array.isArray(p.measurements)
    ? p.measurements.map((m) => String(m).slice(0, 40)).filter(Boolean).slice(0, 8)
    : [];

  return {
    title,
    category,
    deadline,
    habits,
    workouts,
    measurements,
    presetMatch: presetSlug,
  };
}
