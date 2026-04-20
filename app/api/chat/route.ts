import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vitaTools } from "@/lib/vita-tools";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { buildMemoryContext, extractAndSaveMemories } from "@/lib/memory";
import { classifyMessage } from "@/lib/safety";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  messages: z.array(z.any()),
  conversationId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.userId;

  // Rate limit: 60 messages per minute per user
  const rl = rateLimit(`chat:${userId}`, 60, 60_000);
  if (!rl.ok) {
    return new Response("Too many requests", { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });
  }

  const body = bodySchema.parse(await req.json());

  // Verify conversation belongs to user
  const conversation = await prisma.conversation.findFirst({
    where: { id: body.conversationId, userId },
  });
  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  // Build context
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, customInstructions: true, customResponseStyle: true, heightCm: true, activityLevel: true, goalWeightKg: true },
  });

  const latestWeight = await prisma.measurement.findFirst({
    where: { userId, kind: "weight" }, orderBy: { capturedAt: "desc" },
  });

  const profileContext = [
    user.heightCm ? `Height: ${user.heightCm}cm` : null,
    latestWeight ? `Current weight: ${latestWeight.value}${latestWeight.unit}` : null,
    user.goalWeightKg ? `Goal weight: ${user.goalWeightKg}kg` : null,
    user.activityLevel ? `Activity level: ${user.activityLevel}` : null,
  ].filter(Boolean).join("\n");

  // Persist user message
  const lastMessage = body.messages[body.messages.length - 1];

  // Semantic memory recall
  const lastUserContent = typeof lastMessage?.content === "string"
    ? lastMessage.content
    : JSON.stringify(lastMessage?.content ?? "");
  const memoryContext = await buildMemoryContext(userId, lastUserContent);

  const systemPrompt = buildSystemPrompt({
    userName: user.name,
    customInstructions: user.customInstructions,
    customResponseStyle: user.customResponseStyle,
    profileContext,
    memoryContext,
  });
  if (lastMessage?.role === "user") {
    await prisma.message.create({
      data: {
        conversationId: body.conversationId,
        role: "user",
        content: typeof lastMessage.content === "string" ? lastMessage.content : JSON.stringify(lastMessage.content),
      },
    });
  }

  // Auto-title conversation on first message
  if (!conversation.title && body.messages.length === 1) {
    const firstText = typeof lastMessage.content === "string"
      ? lastMessage.content.slice(0, 80)
      : "New conversation";
    await prisma.conversation.update({
      where: { id: body.conversationId },
      data: { title: firstText },
    });
  }

  // ── Safety guardrails ────────────────────────────────────────────────────────
  const safety = await classifyMessage(lastUserContent);

  // Log safety classification to AuditLog (best-effort)
  if (safety.category !== "safe") {
    prisma.auditLog.create({
      data: {
        userId,
        action: "safety_flag",
        entityType: "conversation",
        entityId: body.conversationId,
        details: JSON.stringify({ category: safety.category, confidence: safety.confidence }),
      },
    }).catch(() => {});
  }

  // Crisis: return immediate hard-stop response with crisis card
  if (safety.category === "crisis") {
    const crisisPayload = JSON.stringify({
      toolName: "show_crisis_resources",
      result: {
        message: safety.message ?? "You don't have to face this alone. Support is available right now.",
      },
    });
    // Return a data stream with a tool-result event so CrisisCard renders
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // AI SDK data stream format: tool result followed by done
        controller.enqueue(encoder.encode(`2:${crisisPayload}\n`));
        controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "x-vercel-ai-data-stream": "v1" },
    });
  }

  // Build enriched system prompt with safety notes if needed
  let finalSystemPrompt = systemPrompt;
  if (safety.category === "disordered_eating") {
    finalSystemPrompt += `\n\n[SAFETY NOTE] The user's message has been flagged for potential disordered eating patterns. Respond with empathy and care. Do NOT recommend calorie deficits below 1200 kcal/day. Gently encourage professional support if appropriate. Never reinforce restriction, purging, or diet culture language.`;
  } else if (safety.category === "unsafe_goal") {
    finalSystemPrompt += `\n\n[SAFETY NOTE] The user's message contains an unsafe weight-loss goal (e.g., >2 lbs/week or extreme BMI target). Acknowledge their motivation but redirect to safe, sustainable targets (0.5–1 lb/week). Explain health risks of rapid weight loss.`;
  } else if (safety.category === "injury_risk") {
    finalSystemPrompt += `\n\n[SAFETY NOTE] The user may be considering training through a serious injury. Respond with caution — recommend rest, professional medical evaluation, and safe alternatives. Do not endorse training that could worsen injury.`;
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: finalSystemPrompt,
    messages: body.messages,
    tools: vitaTools(userId),
    maxSteps: 10,
    onFinish: async ({ text }) => {
      if (text) {
        await prisma.message.create({
          data: {
            conversationId: body.conversationId,
            role: "assistant",
            content: text,
          },
        });
        // Async memory extraction — fire and forget
        extractAndSaveMemories(userId, lastUserContent, text).catch(() => {});
      }
      await prisma.conversation.update({
        where: { id: body.conversationId },
        data: { updatedAt: new Date() },
      });
    },
  });

  return result.toDataStreamResponse();
}
