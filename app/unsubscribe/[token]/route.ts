import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Handle RFC 8058 one-click unsubscribe POST from Gmail/Yahoo
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await prisma.unsubscribeToken.findUnique({ where: { token } });
  if (!record) return new NextResponse(null, { status: 404 });

  if (record.category) {
    await prisma.emailPreference.upsert({
      where: { userId: record.userId },
      create: { userId: record.userId, [record.category]: false },
      update: { [record.category]: false },
    });
  } else {
    await prisma.emailPreference.upsert({
      where: { userId: record.userId },
      create: {
        userId: record.userId,
        dailyMorningPlan: false, tomorrowEvening: false, weeklyReview: false,
        monthlyReport: false, workoutReminders: false, measurementNudges: false,
        photoNudges: false, milestones: false, winback: false, birthday: false, onboardingSeries: false,
      },
      update: {
        dailyMorningPlan: false, tomorrowEvening: false, weeklyReview: false,
        monthlyReport: false, workoutReminders: false, measurementNudges: false,
        photoNudges: false, milestones: false, winback: false, birthday: false, onboardingSeries: false,
      },
    });
  }

  return new NextResponse(null, { status: 200 });
}
