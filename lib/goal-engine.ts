import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { prisma } from "./prisma";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── parseGoalFromNL ──────────────────────────────────────────────────────────

export async function parseGoalFromNL(text: string): Promise<{
  description: string;
  direction: "increase" | "decrease" | "maintain";
  magnitude?: number;
  unit?: string;
  deadline?: string;
}> {
  const { text: raw } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    prompt: `Extract structured goal data from the following natural language goal description.
Return ONLY valid JSON with these fields:
- description: string (clean description of the goal)
- direction: "increase" | "decrease" | "maintain"
- magnitude: number | null (numeric target amount, e.g. 15 for "lose 15 pounds")
- unit: string | null (e.g. "lbs", "kg", "cm", "minutes")
- deadline: string | null (ISO date YYYY-MM-DD, infer year ${new Date().getFullYear()} if not specified; Christmas = ${new Date().getFullYear()}-12-25)

Goal: "${text}"

Respond with ONLY the JSON object, no markdown, no explanation.`,
  });

  let parsed: {
    description: string;
    direction: "increase" | "decrease" | "maintain";
    magnitude?: number | null;
    unit?: string | null;
    deadline?: string | null;
  };
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    // Fallback: try to extract JSON from the response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Failed to parse goal JSON from AI response");
    parsed = JSON.parse(match[0]);
  }

  return {
    description: parsed.description,
    direction: parsed.direction,
    ...(parsed.magnitude != null ? { magnitude: parsed.magnitude } : {}),
    ...(parsed.unit ? { unit: parsed.unit } : {}),
    ...(parsed.deadline ? { deadline: parsed.deadline } : {}),
  };
}

// ─── predictHitDate ───────────────────────────────────────────────────────────

export async function predictHitDate(
  userId: string,
  goalId: string
): Promise<Date | null> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
  });
  if (!goal || goal.magnitude == null) return null;

  // Determine measurement kind from goal unit/description
  const kind = inferMeasurementKind(goal);

  const measurements = await prisma.measurement.findMany({
    where: { userId, kind },
    orderBy: { capturedAt: "asc" },
    take: 90, // up to 90 data points
  });

  if (measurements.length < 3) return null;

  // Convert dates to numeric days from first measurement
  const t0 = measurements[0].capturedAt.getTime();
  const xs = measurements.map((m) => (m.capturedAt.getTime() - t0) / 86400000);
  const ys = measurements.map((m) => m.value);

  // Simple linear regression
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // No progress in the right direction
  if (goal.direction === "decrease" && slope >= 0) return null;
  if (goal.direction === "increase" && slope <= 0) return null;
  if (goal.direction === "maintain") return null;

  const target = goal.magnitude;
  // Days from t0 to reach target: target = intercept + slope * x => x = (target - intercept) / slope
  const daysToTarget = (target - intercept) / slope;
  if (daysToTarget < 0 || !isFinite(daysToTarget)) return null;

  // Cap at 5 years out to avoid absurd predictions
  if (daysToTarget > 5 * 365) return null;

  const predictedDate = new Date(t0 + daysToTarget * 86400000);
  return predictedDate;
}

function inferMeasurementKind(goal: {
  description: string;
  unit?: string | null;
  bodyArea?: string | null;
}): string {
  const text = `${goal.description} ${goal.unit ?? ""} ${goal.bodyArea ?? ""}`.toLowerCase();
  if (text.includes("weight") || text.includes("pound") || text.includes("kg") || text.includes("lb")) return "weight";
  if (text.includes("waist")) return "waist";
  if (text.includes("hip")) return "hips";
  if (text.includes("bust") || text.includes("chest")) return "bust";
  if (text.includes("thigh")) return "thigh_l";
  if (text.includes("bicep") || text.includes("arm")) return "bicep_l";
  if (text.includes("glute")) return "glute";
  return "weight"; // default
}

// ─── generateWeeklyPlan ───────────────────────────────────────────────────────

export async function generateWeeklyPlan(userId: string): Promise<{
  days: { day: string; workouts: string[]; rest: boolean }[];
  weekLabel: string;
}> {
  const [user, goals, recentWorkouts] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        activityLevel: true,
        heightCm: true,
        sex: true,
        medicalNotes: true,
        goalWeightKg: true,
      },
    }),
    prisma.goal.findMany({
      where: { userId, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);

  const goalDescriptions = goals.map((g) => g.description).join("; ") || "General fitness";
  const recentWorkoutNames = recentWorkouts.map((w) => w.workoutName).join(", ") || "None";
  const activityLevel = user.activityLevel ?? "moderate";

  // Determine week label (Mon-Sun of next week)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const { text: raw } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    prompt: `Create a 7-day weekly workout plan for a fitness app user.

User profile:
- Activity level: ${activityLevel}
- Goals: ${goalDescriptions}
- Recent workouts: ${recentWorkoutNames}
- Medical notes: ${user.medicalNotes ?? "None"}

Return ONLY a valid JSON object with this exact structure:
{
  "days": [
    { "day": "Monday", "workouts": ["30 min cardio", "15 min stretching"], "rest": false },
    { "day": "Tuesday", "workouts": [], "rest": true },
    ...7 days total (Monday through Sunday)
  ]
}

Rules:
- Include 2-4 rest days appropriate to the activity level
- Workouts should be specific and actionable (e.g. "30 min brisk walk", "Upper body strength 45 min")
- Align workouts with the user's goals
- Rest days should have empty workouts array and rest: true
- Return ONLY the JSON object, no markdown, no explanation.`,
  });

  let parsed: { days: { day: string; workouts: string[]; rest: boolean }[] };
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      // Return a safe fallback
      return {
        days: [
          { day: "Monday", workouts: ["30 min cardio"], rest: false },
          { day: "Tuesday", workouts: [], rest: true },
          { day: "Wednesday", workouts: ["Strength training 45 min"], rest: false },
          { day: "Thursday", workouts: [], rest: true },
          { day: "Friday", workouts: ["30 min cardio"], rest: false },
          { day: "Saturday", workouts: ["Active recovery: yoga 30 min"], rest: false },
          { day: "Sunday", workouts: [], rest: true },
        ],
        weekLabel,
      };
    }
    parsed = JSON.parse(match[0]);
  }

  return {
    days: parsed.days,
    weekLabel,
  };
}
