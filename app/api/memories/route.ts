import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveMemory } from "@/lib/memory";
import { z } from "zod";

const CreateSchema = z.object({
  type: z.enum(["profile", "journal", "episodic"]),
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(4000),
});

export async function GET() {
  const session = await requireSession();

  const memories = await prisma.memory.findMany({
    where: { userId: session.userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, title: true, content: true, source: true, createdAt: true },
  });

  return NextResponse.json({ memories });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, { status: 400 });
  }

  await saveMemory(session.userId, parsed.data.type, parsed.data.content, {
    title: parsed.data.title,
    source: "user",
  });

  return NextResponse.json({ ok: true });
}
