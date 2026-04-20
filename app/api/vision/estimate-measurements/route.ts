import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BodySchema = z.object({
  photoUrl: z.string().url(),
  heightCm: z.number().optional(),
});

export async function POST(req: NextRequest) {
  await requireSession();

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { photoUrl, heightCm } = parsed.data;

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: new URL(photoUrl),
            },
            {
              type: "text",
              text: `Analyze this full-body photo and estimate body measurements.${heightCm ? ` The person's height is ${heightCm}cm.` : ""}

Return ONLY valid JSON with this exact structure:
{
  "weightKg": <number or null>,
  "bodyFatPct": <number or null>,
  "shoulderWidthCm": <number or null>,
  "waistCm": <number or null>,
  "hipsCm": <number or null>,
  "confidence": "low" | "medium" | "high",
  "notes": "<brief honest assessment of accuracy>"
}

Be conservative with estimates. If the photo doesn't show enough of the body, set most values to null and confidence to "low". Never claim high confidence for weight or body fat — these are rough visual estimates only.`,
            },
          ],
        },
      ],
      maxTokens: 400,
    });

    const measurements = JSON.parse(text.trim());
    return NextResponse.json({ measurements });
  } catch {
    return NextResponse.json(
      { error: "Could not analyze photo" },
      { status: 422 }
    );
  }
}
