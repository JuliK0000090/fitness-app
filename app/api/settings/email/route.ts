import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireSession();
  const pref = await prisma.emailPreference.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId },
    update: {},
  });
  return NextResponse.json(pref);
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();
  const pref = await prisma.emailPreference.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, ...body },
    update: body,
  });
  return NextResponse.json(pref);
}
