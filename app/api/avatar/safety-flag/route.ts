import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.userId;

  const body = await req.json() as { flag: string; note?: string; setBy?: string };
  if (!body.flag) {
    return NextResponse.json({ error: "flag required" }, { status: 400 });
  }

  await db.safetyFlag.create({
    data: {
      userId,
      flag: body.flag,
      setBy: body.setBy ?? "user_manual",
      note: body.note ?? null,
    },
  });

  await db.avatar.upsert({
    where: { userId },
    create: { userId, definition: {}, visibility: "LIMITED", style: "ABSTRACT" },
    update: { visibility: "LIMITED", style: "ABSTRACT" },
  });

  return NextResponse.json({ ok: true });
}
