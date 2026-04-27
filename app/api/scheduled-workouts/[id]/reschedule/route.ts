import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = schema.parse(await req.json());

    const newDate = new Date(body.date + "T00:00:00.000Z");

    const workout = await prisma.scheduledWorkout.findFirst({
      where: { id, userId: session.userId },
    });

    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    if (workout.status === "DONE") {
      return NextResponse.json({ error: "Cannot move a completed workout" }, { status: 400 });
    }

    const updated = await prisma.scheduledWorkout.update({
      where: { id },
      data: {
        scheduledDate: newDate,
        status: "MOVED",
        userEdited: true,
      },
      select: { id: true, scheduledDate: true, status: true },
    });

    return NextResponse.json({ ok: true, workout: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[reschedule]", err);
    return NextResponse.json({ error: "Failed to reschedule" }, { status: 500 });
  }
}
