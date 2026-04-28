import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateWorkoutStatusChange } from "@/lib/calendar/temporal-rules";

const XP_WORKOUT = 50;

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.userId;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sw = await prisma.scheduledWorkout.findFirst({ where: { id, userId } });
  if (!sw) return NextResponse.json({ error: "Scheduled workout not found" }, { status: 404 });

  // Temporal guard — user-tz aware. Returns 400 with a clear reason rather
  // than letting the DB CHECK constraint surface as a 500.
  if (sw.status === "DONE") {
    return NextResponse.json({ ok: true, alreadyDone: true }, { status: 200 });
  }
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  const tz = u?.timezone ?? "UTC";
  const tCheck = validateWorkoutStatusChange({
    scheduledDate: sw.scheduledDate,
    userTimezone: tz,
    currentStatus: sw.status,
    newStatus: "DONE",
  });
  if (!tCheck.ok) {
    return NextResponse.json({ error: tCheck.reason, code: tCheck.code }, { status: 400 });
  }

  const log = await prisma.workoutLog.create({
    data: {
      userId,
      typeId: sw.workoutTypeId ?? null,
      workoutName: sw.workoutTypeName ?? "Workout",
      durationMin: sw.duration,
      xpAwarded: XP_WORKOUT,
    },
  });

  await prisma.scheduledWorkout.update({
    where: { id },
    data: { status: "DONE", completedAt: new Date(), workoutLogId: log.id, pointsEarned: XP_WORKOUT },
  });

  const { totalXp } = await prisma.user.update({
    where: { id: userId },
    data: { totalXp: { increment: XP_WORKOUT } },
    select: { totalXp: true },
  });

  return NextResponse.json({ ok: true, workoutLogId: log.id, xpAwarded: XP_WORKOUT, totalXp });
}
