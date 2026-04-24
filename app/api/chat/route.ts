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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMessage = { role: string; content: unknown; [k: string]: unknown };

/**
 * Anthropic requires strictly alternating user/assistant messages.
 * If multiple user messages pile up (e.g., after failed retries), merge them
 * so the AI can still process them without a 400.
 */
function sanitizeMessages(messages: AnyMessage[]): AnyMessage[] {
  const out: AnyMessage[] = [];
  for (const msg of messages) {
    const prev = out[out.length - 1];
    if (prev && prev.role === msg.role && msg.role === "user") {
      // Merge: append the new content to the previous user message
      const prevText = typeof prev.content === "string" ? prev.content : JSON.stringify(prev.content);
      const newText  = typeof msg.content  === "string" ? msg.content  : JSON.stringify(msg.content);
      out[out.length - 1] = { ...prev, content: `${prevText}\n\n${newText}` };
    } else {
      out.push(msg);
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const userId = session.userId;

  // Rate limit: 60 messages per minute per user
  const rl = await rateLimit(`chat:${userId}`, 60, 60_000);
  if (!rl.ok) {
    return new Response("Too many requests", { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: { messages: any[]; conversationId: string };
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Verify conversation belongs to user
  const conversation = await prisma.conversation.findFirst({
    where: { id: body.conversationId, userId },
  });
  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  // Build context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma.user.findUniqueOrThrow as any)({
    where: { id: userId },
    select: { name: true, customInstructions: true, customResponseStyle: true, heightCm: true, activityLevel: true, goalWeightKg: true, onGlp1: true },
  }) as { name: string | null; customInstructions: string | null; customResponseStyle: string | null; heightCm: number | null; activityLevel: string | null; goalWeightKg: number | null; onGlp1: boolean };

  const [latestWeight, activeGoals, activeHabits] = await Promise.all([
    prisma.measurement.findFirst({ where: { userId, kind: "weight" }, orderBy: { capturedAt: "desc" } }),
    prisma.goal.findMany({
      where: { userId, status: { in: ["active", "paused"] } },
      orderBy: [{ status: "asc" }, { priority: "asc" }],
      select: {
        id: true, title: true, category: true, targetMetric: true,
        targetValue: true, currentValue: true, unit: true,
        deadline: true, predictedHitDate: true, status: true,
      },
      take: 8,
    }),
    prisma.habit.findMany({
      where: { userId, active: true },
      select: { id: true, title: true, cadence: true, pointsOnComplete: true },
      take: 12,
    }),
  ]);

  // Build goal context lines — injected into every Vita response
  const goalLines = activeGoals.map((g) => {
    const parts: string[] = [`[id:${g.id}] ${g.title ?? "Goal"} (${g.status})`];
    if (g.targetValue != null && g.currentValue != null && g.unit)
      parts.push(`${g.currentValue} → ${g.targetValue} ${g.unit}`);
    if (g.deadline) parts.push(`deadline: ${g.deadline.toISOString().split("T")[0]}`);
    if (g.predictedHitDate) parts.push(`predicted: ${g.predictedHitDate.toISOString().split("T")[0]}`);
    return parts.join(" · ");
  });
  const habitLines = activeHabits.map((h) => `[id:${h.id}] ${h.title ?? "Habit"} (${h.cadence})`);

  const profileContext = [
    user.heightCm ? `Height: ${user.heightCm}cm` : null,
    latestWeight ? `Current weight: ${latestWeight.value}${latestWeight.unit}` : null,
    user.goalWeightKg ? `Goal weight: ${user.goalWeightKg}kg` : null,
    user.activityLevel ? `Activity level: ${user.activityLevel}` : null,
    user.onGlp1 ? `On GLP-1 medication: yes — prioritise strength training and high protein to preserve muscle; avoid recommending large calorie deficits on top of the medication's natural appetite suppression.` : null,
    goalLines.length > 0 ? `\nUser's goals:\n${goalLines.map((l) => `  - ${l}`).join("\n")}` : "No goals set yet — ask the user what they want to achieve and by when, then call propose_goal_decomposition.",
    habitLines.length > 0 ? `\nActive habits:\n${habitLines.map((l) => `  - ${l}`).join("\n")}` : null,
  ].filter(Boolean).join("\n");

  // Fetch recent health signals for context
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let healthRows: { metric: string; value: number; unit: string; source: string; trust: number }[] = [];
  try {
    healthRows = await prisma.healthDaily.findMany({
      where: {
        userId,
        date: { gte: new Date(yesterdayStr) },
        metric: { in: ["steps", "sleepHours", "hrvMs", "restingHr", "readinessScore", "activeMinutes"] },
      },
    });
  } catch {
    // HealthDaily table may not exist yet — skip health context gracefully
  }

  const healthLines = healthRows.map(r =>
    `- ${r.metric}: ${r.value.toFixed(r.metric === "sleepHours" ? 1 : 0)} ${r.unit} (${r.source}, trust ${r.trust})`
  );
  const healthContext = healthLines.length > 0
    ? `User's recent health signals:\n${healthLines.join("\n")}`
    : "";

  // Persist user message
  const lastMessage = body.messages[body.messages.length - 1];

  // Semantic memory recall
  const lastUserContent = typeof lastMessage?.content === "string"
    ? lastMessage.content
    : JSON.stringify(lastMessage?.content ?? "");
  const memoryContext = await buildMemoryContext(userId, lastUserContent);

  // Build a brief inline summary of prior conversation turns so the AI always has context
  // even if the message list is trimmed by the client.
  const priorMessages = body.messages.slice(0, -1); // everything except the current message
  const conversationContext = priorMessages.length > 0
    ? priorMessages
        .filter((m: { role: string; content: unknown }) => m.role === "user" || m.role === "assistant")
        .slice(-30) // last 30 turns is plenty; full list is in messages array anyway
        .map((m: { role: string; content: unknown }) => {
          const text = typeof m.content === "string"
            ? m.content
            : Array.isArray(m.content)
              ? (m.content as { type: string; text?: string }[]).filter(p => p.type === "text").map(p => p.text).join(" ")
              : "";
          return `${m.role === "user" ? "User" : "Vita"}: ${text.slice(0, 300)}`;
        })
        .join("\n")
    : "";

  const systemPrompt = buildSystemPrompt({
    userName: user.name,
    customInstructions: user.customInstructions,
    customResponseStyle: user.customResponseStyle,
    profileContext,
    memoryContext,
    healthContext,
    conversationContext,
  });
  if (lastMessage?.role === "user") {
    try {
      const userContent = typeof lastMessage.content === "string" ? lastMessage.content : JSON.stringify(lastMessage.content);
      // Skip persisting if this exact message is already the last one in the DB
      // (happens on auto-resume: the unanswered message is already saved)
      const existingLast = await prisma.message.findFirst({
        where: { conversationId: body.conversationId },
        orderBy: { createdAt: "desc" },
        select: { role: true, content: true },
      });
      const alreadySaved = existingLast?.role === "user" && existingLast.content === userContent;
      if (!alreadySaved) {
        await prisma.message.create({
          data: {
            conversationId: body.conversationId,
            role: "user",
            content: userContent,
          },
        });
      }
    } catch (e) {
      console.error("[chat] persist user message error:", e);
    }
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
    void prisma.auditLog.create({
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

  const sanitized = sanitizeMessages(body.messages as AnyMessage[]);

  try {
    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: finalSystemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: sanitized as any,
      tools: vitaTools(userId),
      maxSteps: 10,
      experimental_continueSteps: true,
      onError: ({ error }) => {
        console.error("[chat] stream error:", error);
      },
      onFinish: async ({ text }) => {
        try {
          if (text) {
            await prisma.message.create({
              data: {
                conversationId: body.conversationId,
                role: "assistant",
                content: text,
              },
            });
            extractAndSaveMemories(userId, lastUserContent, text).catch(() => {});
          }
          await prisma.conversation.update({
            where: { id: body.conversationId },
            data: { updatedAt: new Date() },
          });
        } catch (e) {
          console.error("[chat] onFinish error:", e);
        }
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[chat] stream error:", msg);
        // Return the actual error so the UI shows it instead of generic "An error occurred."
        return msg;
      },
    });
  } catch (e) {
    console.error("[chat] streamText error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "AI error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
