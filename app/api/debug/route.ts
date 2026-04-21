import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

// Diagnostic endpoint — returns what's working and what's failing
// Protected by ADMIN_SECRET
export async function GET(req: Request) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  // 1. DB tables
  const tables = ["conversation", "message", "healthDaily", "memory", "email", "user"] as const;
  for (const t of tables) {
    try {
      // @ts-expect-error dynamic
      await prisma[t].findFirst();
      results[`db_${t}`] = "OK";
    } catch (e) {
      results[`db_${t}`] = `FAIL: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`;
    }
  }

  // 2. Anthropic API key
  results["anthropic_key"] = process.env.ANTHROPIC_API_KEY ? "set" : "MISSING";

  // 3. Model call
  try {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: "Say OK",
      maxTokens: 5,
    });
    results["model_call"] = `OK: ${text}`;
  } catch (e) {
    results["model_call"] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 4. ENV vars present
  results["DATABASE_URL"] = process.env.DATABASE_URL ? "set" : "MISSING";
  results["APP_URL"] = process.env.APP_URL ?? "MISSING";

  return NextResponse.json(results, { status: 200 });
}
