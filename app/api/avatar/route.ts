import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_AVATAR_DEFINITION } from "@/lib/avatar/types";
import type { AvatarDefinition } from "@/lib/avatar/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  const session = await requireSession();
  const userId = session.userId;

  let avatar = await db.avatar.findUnique({ where: { userId } });
  if (!avatar) {
    avatar = await db.avatar.create({
      data: {
        userId,
        definition: DEFAULT_AVATAR_DEFINITION as object,
        visibility: "ON",
        style: "ABSTRACT",
      },
    });
  }

  return NextResponse.json(avatar);
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  const userId = session.userId;

  const body = await req.json();
  const { definition, visibility, style } = body as {
    definition?: Partial<AvatarDefinition>;
    visibility?: "ON" | "LIMITED" | "OFF";
    style?: "ABSTRACT" | "ILLUSTRATED";
  };

  const existing = await db.avatar.findUnique({ where: { userId } });
  const currentDef = (existing?.definition ?? DEFAULT_AVATAR_DEFINITION) as AvatarDefinition;
  const updatedDef = definition ? { ...currentDef, ...definition } : currentDef;

  const avatar = await db.avatar.upsert({
    where: { userId },
    create: {
      userId,
      definition: updatedDef as object,
      visibility: visibility ?? "ON",
      style: style ?? "ABSTRACT",
    },
    update: {
      definition: updatedDef as object,
      ...(visibility && { visibility }),
      ...(style && { style }),
    },
  });

  return NextResponse.json(avatar);
}
