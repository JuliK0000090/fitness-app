import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireSession();
  const userId = session.userId;

  const [user, goals, habits, workoutLogs, measurements, photos, checklistItems, weeklyReviews, memories] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true, email: true, name: true, dob: true, sex: true,
          heightCm: true, activityLevel: true, goalWeightKg: true,
          medicalNotes: true, createdAt: true,
        },
      }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.habit.findMany({ where: { userId } }),
      prisma.workoutLog.findMany({ where: { userId }, orderBy: { startedAt: "desc" } }),
      prisma.measurement.findMany({ where: { userId }, orderBy: { capturedAt: "desc" } }),
      prisma.photo.findMany({
        where: { userId },
        select: { id: true, capturedAt: true, pose: true, notes: true, r2Key: true },
      }),
      prisma.checklistItem.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 365 }),
      prisma.weeklyReview.findMany({ where: { userId }, orderBy: { weekStart: "desc" } }),
      prisma.memory.findMany({ where: { userId, deletedAt: null } }),
    ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: user,
    goals,
    habits,
    workoutLogs,
    measurements,
    photos,
    checklistItems,
    weeklyReviews,
    memories,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="vita-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
