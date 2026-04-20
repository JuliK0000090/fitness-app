import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireSession();

  const goals = await prisma.goal.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();

  const { description, direction, magnitude, unit, deadline } = body as {
    description: string;
    direction: string;
    magnitude?: number;
    unit?: string;
    deadline?: string;
  };

  if (!description || !direction) {
    return NextResponse.json(
      { error: "description and direction are required" },
      { status: 400 }
    );
  }

  const goal = await prisma.goal.create({
    data: {
      userId: session.userId,
      description,
      direction,
      magnitude: magnitude ?? null,
      unit: unit ?? null,
      deadline: deadline ? new Date(deadline) : null,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
