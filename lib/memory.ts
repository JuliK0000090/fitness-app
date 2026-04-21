import { prisma } from "./prisma";

// ─── Save a memory ────────────────────────────────────────────────────────────
export async function saveMemory(
  userId: string,
  type: "profile" | "journal" | "episodic",
  content: string,
  opts: { title?: string; source?: string; weekOf?: Date; eventDate?: Date } = {}
) {
  return prisma.memory.create({
    data: {
      userId,
      type,
      content,
      title: opts.title ?? null,
      source: opts.source ?? "auto",
      weekOf: opts.weekOf ?? null,
      eventDate: opts.eventDate ?? null,
    },
  });
}

// ─── Recall recent memories ───────────────────────────────────────────────────
export async function recallMemories(
  userId: string,
  _query: string,
  opts: { limit?: number; type?: string } = {}
): Promise<{ id: string; type: string; title: string | null; content: string; createdAt: Date }[]> {
  const { limit = 5, type } = opts;
  return prisma.memory.findMany({
    where: { userId, deletedAt: null, ...(type ? { type } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, type: true, title: true, content: true, createdAt: true },
  });
}

// ─── Build memory context string for system prompt ───────────────────────────
export async function buildMemoryContext(userId: string, query: string): Promise<string> {
  try {
    const memories = await recallMemories(userId, query, { limit: 6 });
    if (memories.length === 0) return "";
    const lines = memories.map((m) => {
      const label = m.type === "profile" ? "Profile note" : m.type === "journal" ? "Journal" : "Past event";
      return `[${label}${m.title ? ` — ${m.title}` : ""}]: ${m.content}`;
    });
    return `Relevant memories:\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

// ─── Auto-extract and save memories from a conversation turn ─────────────────
export async function extractAndSaveMemories(
  userId: string,
  userMessage: string,
  assistantReply: string
) {
  if (!process.env.ANTHROPIC_API_KEY) return;

  try {
    const { generateText } = await import("ai");
    const { createAnthropic } = await import("@ai-sdk/anthropic");
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `Extract factual memories worth saving from this fitness coaching conversation.
User: ${userMessage}
Assistant: ${assistantReply}

Return JSON array of objects with fields: type ("profile"|"journal"|"episodic"), title (short), content (1-2 sentences).
Only extract clear facts about the user (goals, preferences, measurements, past events). If nothing notable, return [].
Reply with only valid JSON.`,
      maxTokens: 400,
    });

    const items = JSON.parse(text.trim());
    if (!Array.isArray(items)) return;

    for (const item of items.slice(0, 3)) {
      if (item.type && item.content) {
        await saveMemory(userId, item.type, item.content, { title: item.title, source: "auto" });
      }
    }
  } catch {
    // Non-critical — silently skip
  }
}
