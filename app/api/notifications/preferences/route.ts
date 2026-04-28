import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TIME_RE = /^\d{2}:\d{2}$/;

const PatchBody = z.object({
  preWorkout: z.boolean().optional(),
  streakSave: z.boolean().optional(),
  weeklyReview: z.boolean().optional(),
  reactiveAdjustment: z.boolean().optional(),
  partnerEncouragement: z.boolean().optional(),
  quietHoursStart: z.string().regex(TIME_RE, "HH:MM").optional(),
  quietHoursEnd: z.string().regex(TIME_RE, "HH:MM").optional(),
});

export async function GET() {
  const session = await requireSession();
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId },
    update: {},
  });
  const subs = await prisma.pushSubscription.count({ where: { userId: session.userId } });
  return NextResponse.json({
    preferences: prefs,
    pushEnabled: subs > 0,
    publicVapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  const body = PatchBody.parse(await req.json());
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, ...body },
    update: body,
  });
  return NextResponse.json({ preferences: prefs });
}
