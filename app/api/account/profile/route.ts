import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();

  const allowed = ["name", "heightCm", "sex", "activityLevel", "goalWeightKg", "medicalNotes", "customInstructions", "customResponseStyle", "onboardingComplete", "analyticsConsent"];
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const user = await prisma.user.update({ where: { id: session.userId }, data });
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
}

export async function GET() {
  const session = await requireSession();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, dob: true, sex: true, heightCm: true, activityLevel: true, goalWeightKg: true, medicalNotes: true, customInstructions: true, customResponseStyle: true, avatarUrl: true, onboardingComplete: true, emailVerified: true },
  });
  return NextResponse.json(user);
}
