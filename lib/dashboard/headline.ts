/**
 * Morning dashboard headline.
 *
 * Vita writes a single short paragraph (2–3 sentences, ~30–50 words) that
 * sits at the top of /today. Generated once per user per day. The
 * morning Inngest job (lib/jobs/dashboard.ts) pre-fills it during the
 * user's local 6:00–7:30 window. /today reads from cache; if the cache
 * is missing it falls back to a deterministic line so the page never
 * blocks on an LLM call.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { userToday, userYesterday, userTodayStr } from "@/lib/time/today";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASELINE_DAYS = 30;

export type HeadlineContext = {
  sleepHoursLastNight: number | null;
  sleepDeltaPct: number | null;        // vs 30d baseline
  hrvMs: number | null;
  hrvDeltaPct: number | null;
  restingHr: number | null;
  restingHrDelta: number | null;       // bpm absolute delta vs baseline
  stepsToday: number | null;
  localTimeOfDay: string;              // e.g. "06:42"
  workoutsToday: { name: string; time: string | null }[];
  primaryGoalTitle: string | null;
  yesterdayWearableResults: { habitTitle: string; status: "DONE" | "MISSED"; valueText: string }[];
};

/**
 * Read everything needed to generate (or describe) today's headline.
 * Returns a stable context object that can be hashed for cache busting.
 */
export async function buildHeadlineContext(userId: string): Promise<HeadlineContext> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const tz = user.timezone ?? "UTC";
  const today = userToday(tz);
  const yesterday = userYesterday(tz);

  const baselineFrom = new Date(today);
  baselineFrom.setUTCDate(baselineFrom.getUTCDate() - BASELINE_DAYS);

  const [sleepLastNight, hrvLastNight, rhrLastNight, stepsToday, baselineRows, todaysWorkouts, primaryGoal, yesterdayHabitResults] = await Promise.all([
    prisma.healthDaily.findUnique({ where: { userId_date_metric: { userId, date: yesterday, metric: "sleepHours" } } }),
    prisma.healthDaily.findUnique({ where: { userId_date_metric: { userId, date: yesterday, metric: "hrvMs" } } }),
    prisma.healthDaily.findUnique({ where: { userId_date_metric: { userId, date: yesterday, metric: "restingHr" } } }),
    prisma.healthDaily.findUnique({ where: { userId_date_metric: { userId, date: today, metric: "steps" } } }),
    prisma.healthDaily.findMany({
      where: {
        userId,
        date: { gte: baselineFrom, lt: today },
        metric: { in: ["sleepHours", "hrvMs", "restingHr"] },
      },
      select: { metric: true, value: true },
    }),
    prisma.scheduledWorkout.findMany({
      where: { userId, scheduledDate: today, status: { in: ["PLANNED", "MOVED"] } },
      orderBy: { scheduledTime: "asc" },
      select: { workoutTypeName: true, scheduledTime: true },
    }),
    prisma.goal.findFirst({
      where: { userId, status: "active" },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: { title: true, description: true },
    }),
    // Yesterday's wearable habit completions
    prisma.habitCompletion.findMany({
      where: { userId, date: yesterday, source: "WEARABLE_AUTO" },
      include: { habit: { select: { title: true, metricKey: true, metricTarget: true } } },
    }),
  ]);

  const baselineAvg = (metric: string): number | null => {
    const vals = baselineRows.filter((r) => r.metric === metric).map((r) => r.value);
    if (vals.length < 5) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const sleepBaseline = baselineAvg("sleepHours");
  const hrvBaseline = baselineAvg("hrvMs");
  const rhrBaseline = baselineAvg("restingHr");

  const sleepHours = sleepLastNight?.value ?? null;
  const hrvMs = hrvLastNight?.value ?? null;
  const restingHr = rhrLastNight?.value ?? null;

  const sleepDeltaPct = (sleepHours !== null && sleepBaseline)
    ? Math.round(((sleepHours - sleepBaseline) / sleepBaseline) * 100) : null;
  const hrvDeltaPct = (hrvMs !== null && hrvBaseline)
    ? Math.round(((hrvMs - hrvBaseline) / hrvBaseline) * 100) : null;
  const restingHrDelta = (restingHr !== null && rhrBaseline)
    ? Math.round(restingHr - rhrBaseline) : null;

  const localTimeOfDay = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());

  return {
    sleepHoursLastNight: sleepHours,
    sleepDeltaPct,
    hrvMs,
    hrvDeltaPct,
    restingHr,
    restingHrDelta,
    stepsToday: stepsToday?.value ?? null,
    localTimeOfDay,
    workoutsToday: todaysWorkouts.map((w) => ({
      name: w.workoutTypeName ?? "Workout",
      time: w.scheduledTime ?? null,
    })),
    primaryGoalTitle: primaryGoal?.title ?? primaryGoal?.description ?? null,
    yesterdayWearableResults: yesterdayHabitResults.map((c) => {
      const target = c.habit.metricTarget ?? 0;
      const ratio = target ? "met" : "logged";
      void ratio;
      const valueText = c.habit.metricKey === "steps"
        ? `${target.toLocaleString()} steps`
        : c.habit.metricKey === "sleepHours"
          ? `${target}h sleep`
          : c.habit.metricKey === "activeMinutes"
            ? `${target} active min`
            : c.habit.title ?? "habit";
      return {
        habitTitle: c.habit.title ?? "habit",
        status: c.status as "DONE" | "MISSED",
        valueText,
      };
    }),
  };
}

/**
 * Returns the headline for today, generating + caching if not yet present.
 * If the LLM call fails, returns a deterministic fallback so the page
 * never blocks.
 */
export async function getOrGenerateTodayHeadline(userId: string): Promise<{ text: string; cached: boolean }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = userToday(user.timezone ?? "UTC");

  const cached = await prisma.todayHeadline.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  if (cached) return { text: cached.text, cached: true };

  const ctx = await buildHeadlineContext(userId);
  let text: string;
  try {
    text = await generateHeadlineText(ctx);
  } catch (e) {
    console.error("[headline] LLM call failed:", e instanceof Error ? e.message : e);
    text = fallbackHeadline(ctx);
  }
  const contextHash = hashContext(ctx);

  await prisma.todayHeadline.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, text, contextHash },
    update: { text, contextHash, generatedAt: new Date() },
  });

  return { text, cached: false };
}

/**
 * For the Inngest morning job. Same as getOrGenerateTodayHeadline but
 * skips work if a headline for today already exists. Returns
 * `generated: true` only when an LLM call actually happened.
 */
export async function ensureTodayHeadline(userId: string): Promise<{ generated: boolean }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = userToday(user.timezone ?? "UTC");
  const existing = await prisma.todayHeadline.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  if (existing) return { generated: false };
  await getOrGenerateTodayHeadline(userId);
  return { generated: true };
}

// ── LLM call ─────────────────────────────────────────────────────────────────

async function generateHeadlineText(ctx: HeadlineContext): Promise<string> {
  const lines: string[] = [];
  if (ctx.sleepHoursLastNight !== null) {
    const h = Math.floor(ctx.sleepHoursLastNight);
    const m = Math.round((ctx.sleepHoursLastNight - h) * 60);
    const delta = ctx.sleepDeltaPct !== null ? ` (${ctx.sleepDeltaPct >= 0 ? "+" : ""}${ctx.sleepDeltaPct}% vs 30d avg)` : "";
    lines.push(`Last night sleep: ${h}h ${m}m${delta}`);
  }
  if (ctx.hrvMs !== null) {
    const delta = ctx.hrvDeltaPct !== null ? ` (${ctx.hrvDeltaPct >= 0 ? "+" : ""}${ctx.hrvDeltaPct}% vs baseline)` : "";
    lines.push(`HRV: ${Math.round(ctx.hrvMs)} ms${delta}`);
  }
  if (ctx.restingHr !== null) {
    const delta = ctx.restingHrDelta !== null ? ` (${ctx.restingHrDelta >= 0 ? "+" : ""}${ctx.restingHrDelta} bpm vs baseline)` : "";
    lines.push(`Resting HR: ${Math.round(ctx.restingHr)} bpm${delta}`);
  }
  if (ctx.stepsToday !== null) {
    lines.push(`Steps so far today: ${Math.round(ctx.stepsToday).toLocaleString()} (it is now ${ctx.localTimeOfDay})`);
  }
  if (ctx.workoutsToday.length > 0) {
    const desc = ctx.workoutsToday.map((w) => w.time ? `${w.name} at ${w.time}` : w.name).join(", ");
    lines.push(`Workouts scheduled today: ${desc}`);
  } else {
    lines.push(`No workouts scheduled today.`);
  }
  if (ctx.primaryGoalTitle) lines.push(`Primary goal: ${ctx.primaryGoalTitle}`);
  if (ctx.yesterdayWearableResults.length > 0) {
    const pieces = ctx.yesterdayWearableResults.map((r) => `${r.valueText}: ${r.status === "DONE" ? "hit" : "missed"}`);
    lines.push(`Yesterday: ${pieces.join(", ")}`);
  }

  const contextBlock = lines.length > 0 ? lines.map((l) => `- ${l}`).join("\n") : "- (no wearable data yet)";

  const prompt = `You are Vita, writing a single short paragraph (2-3 sentences, ~30-50 words) for this user's dashboard headline. Restrained, observational, no exclamation, no emoji.

Context:
${contextBlock}

Tone: like a thoughtful friend who happens to know your numbers. Not a coach barking. Not chipper. Just observant. End with one short clause that suggests how today might go (not commands).

Examples of the right voice:
- "You slept 7h 12m. HRV is up 9% from your baseline. You're at 6,847 steps and your reformer is at 6pm. This is a good day."
- "Sleep was light last night, just under 6h. HRV down 8%. I'd take today gently — your reformer is on the calendar but a walk would be just as honest."
- "You're three days into the streak. Numbers are steady. The hard yoga at noon is the test of the week."

Output the paragraph only. No preamble.`;

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt,
    maxTokens: 200,
  });
  return text.trim();
}

// ── Fallback (no LLM) ────────────────────────────────────────────────────────

function fallbackHeadline(ctx: HeadlineContext): string {
  const pieces: string[] = [];
  if (ctx.sleepHoursLastNight !== null) {
    const h = Math.floor(ctx.sleepHoursLastNight);
    const m = Math.round((ctx.sleepHoursLastNight - h) * 60);
    pieces.push(`You slept ${h}h ${m}m.`);
  }
  if (ctx.hrvMs !== null && ctx.hrvDeltaPct !== null) {
    const dir = ctx.hrvDeltaPct >= 0 ? "up" : "down";
    pieces.push(`HRV is ${dir} ${Math.abs(ctx.hrvDeltaPct)}% from baseline.`);
  }
  if (ctx.workoutsToday.length > 0) {
    const w = ctx.workoutsToday[0];
    pieces.push(w.time ? `${w.name} is at ${w.time}.` : `${w.name} is on the calendar.`);
  }
  if (pieces.length === 0) {
    return "Your dashboard. Numbers fill in as your wearable syncs.";
  }
  return pieces.join(" ");
}

// ── Cache key ────────────────────────────────────────────────────────────────

function hashContext(ctx: HeadlineContext): string {
  return createHash("sha256").update(JSON.stringify(ctx)).digest("hex").slice(0, 16);
}

// Re-export for the page-load fallback path
export { userTodayStr };
