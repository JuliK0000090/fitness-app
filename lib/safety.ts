import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export type SafetyCategory =
  | "safe"
  | "disordered_eating"
  | "unsafe_goal"
  | "crisis"
  | "injury_risk";

export interface SafetyResult {
  category: SafetyCategory;
  confidence: number;
  message?: string;
}

const CLASSIFIER_SYSTEM = `You are a safety classifier for a fitness app. Classify the user message into exactly one category. Return ONLY a JSON object with no markdown.

Categories:
- "safe": normal fitness conversation
- "disordered_eating": extreme calorie restriction (<1000 kcal/day), purging, harmful diet talk, restriction pride
- "unsafe_goal": goals to lose >2 lbs/week, extreme BMI targets below 17, dangerous rapid weight loss
- "crisis": self-harm mentions, suicidal ideation, eating disorder crisis, severe depression language
- "injury_risk": training through serious injury, ignoring medical advice to rest, dangerous pain signals

Return JSON: {"category":"<category>","confidence":<0.0-1.0>,"message":"<optional short note if not safe>"}`;

export async function classifyMessage(text: string): Promise<SafetyResult> {
  try {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const { text: raw } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: CLASSIFIER_SYSTEM,
      prompt: text,
      maxTokens: 100,
    });

    const parsed = JSON.parse(raw.trim()) as SafetyResult;

    // Validate category
    const validCategories: SafetyCategory[] = [
      "safe",
      "disordered_eating",
      "unsafe_goal",
      "crisis",
      "injury_risk",
    ];
    if (!validCategories.includes(parsed.category)) {
      return { category: "safe", confidence: 1 };
    }

    return {
      category: parsed.category,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 1,
      message: parsed.message,
    };
  } catch {
    // Never crash the chat — default to safe
    return { category: "safe", confidence: 1 };
  }
}
