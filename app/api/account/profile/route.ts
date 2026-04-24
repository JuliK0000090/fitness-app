import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();

  // onboardingComplete intentionally excluded — users cannot self-reset their onboarding status
  const allowed = ["name", "heightCm", "sex", "activityLevel", "goalWeightKg", "medicalNotes", "onGlp1", "customInstructions", "customResponseStyle", "analyticsConsent", "todayMode", "onboardingComplete"];
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const user = await prisma.user.update({ where: { id: session.userId }, data });
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
}

export async function GET() {
  const session = await requireSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma.user.findUniqueOrThrow as any)({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, dob: true, sex: true, heightCm: true, activityLevel: true, goalWeightKg: true, medicalNotes: true, onGlp1: true, customInstructions: true, customResponseStyle: true, avatarUrl: true, onboardingComplete: true, emailVerified: true },
  });
  return NextResponse.json(user);
}
