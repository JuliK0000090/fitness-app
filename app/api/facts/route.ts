import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  try {
    const session = await requireSession();
    const facts = await db.userFact.findMany({
      where: { userId: session.userId, active: true },
      orderBy: [{ confidence: "desc" }, { lastConfirmedAt: "desc" }],
    });
    return NextResponse.json({ facts });
  } catch {
    return NextResponse.json({ facts: [] });
  }
}

const updateSchema = z.object({
  value: z.string().optional(),
  confirm: z.boolean().optional(), // reset confidence to 1.0
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  const url = new URL(req.url);
  const factId = url.searchParams.get("id");
  if (!factId) return new NextResponse("id required", { status: 400 });

  const body = updateSchema.parse(await req.json());
  const data: Record<string, unknown> = {};
  if (body.value !== undefined) { data.value = body.value; data.confidence = 1.0; }
  if (body.confirm) { data.confidence = 1.0; data.lastConfirmedAt = new Date(); }
  if (body.active !== undefined) data.active = body.active;

  const fact = await db.userFact.update({
    where: { id: factId, userId: session.userId },
    data,
  });
  return NextResponse.json(fact);
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  const url = new URL(req.url);
  const factId = url.searchParams.get("id");
  if (!factId) return new NextResponse("id required", { status: 400 });

  await db.userFact.update({
    where: { id: factId, userId: session.userId },
    data: { active: false },
  });
  return NextResponse.json({ ok: true });
}
