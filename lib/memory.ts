import { prisma } from "./prisma";
import { createAnthropic } from "@ai-sdk/anthropic";
import { embed } from "ai";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Embed text via Claude's embedding model ──────────────────────────────────
async function embedText(text: string): Promise<number[] | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const { embedding } = await embed({
      model: anthropic.textEmbeddingModel("voyage-3"),
      value: text,
    });
    return embedding;
  } catch {
    // Embedding is optional — falls back to keyword search
    return null;
  }
}

// ─── Save a memory ────────────────────────────────────────────────────────────
export async function saveMemory(
  userId: string,
  type: "profile" | "journal" | "episodic",
  content: string,
  opts: { title?: string; source?: string; weekOf?: Date; eventDate?: Date } = {}
) {
  const embedding = await embedText(content);

  return prisma.$executeRaw`
    INSERT INTO "Memory" (id, "userId", type, title, content, embedding, source, "weekOf", "eventDate", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      ${userId},
      ${type},
      ${opts.title ?? null},
      ${content},
      ${embedding ? `[${embedding.join(",")}]` : null}::vector,
      ${opts.source ?? "auto"},
      ${opts.weekOf ?? null},
      ${opts.eventDate ?? null},
      now(), now()
    )
  `;
}

// ─── Semantic recall (cosine similarity, fallback to keyword) ─────────────────
export async function recallMemories(
  userId: string,
  query: string,
  opts: { limit?: number; type?: string } = {}
): Promise<{ id: string; type: string; title: string | null; content: string; createdAt: Date }[]> {
  const { limit = 5, type } = opts;
  const embedding = await embedText(query);

  if (embedding) {
    const vec = `[${embedding.join(",")}]`;
    // Raw SQL for pgvector cosine similarity
    const rows = await prisma.$queryRaw<{ id: string; type: string; title: string | null; content: string; createdAt: Date }[]>`
      SELECT id, type, title, content, "createdAt"
      FROM "Memory"
      WHERE "userId" = ${userId}
        AND "deletedAt" IS NULL
        ${type ? prisma.$queryRaw`AND type = ${type}` : prisma.$queryRaw``}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vec}::vector
      LIMIT ${limit}
    `;
    return rows;
  }

  // Fallback: recency-based
  return prisma.memory.findMany({
    where: { userId, deletedAt: null, ...(type ? { type } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, type: true, title: true, content: true, createdAt: true },
  }) as Promise<{ id: string; type: string; title: string | null; content: string; createdAt: Date }[]>;
}

// ─── Build memory context string for system prompt ───────────────────────────
export async function buildMemoryContext(userId: string, query: string): Promise<string> {
  const memories = await recallMemories(userId, query, { limit: 6 });
  if (memories.length === 0) return "";

  const lines = memories.map((m) => {
    const label = m.type === "profile" ? "Profile note" : m.type === "journal" ? "Journal" : "Past event";
    return `[${label}${m.title ? ` — ${m.title}` : ""}]: ${m.content}`;
  });

  return `Relevant memories:\n${lines.join("\n")}`;
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
