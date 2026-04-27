import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlanHealthView } from "./PlanHealthView";
import { addWeeks, startOfWeek } from "date-fns";

export default async function PlanHealthPage() {
  const session = await requireSession();
  const userId = session.userId;

  const targets = await prisma.weeklyTarget.findMany({
    where: { userId, active: true },
    select: { id: true, workoutTypeName: true, targetCount: true },
  });

  // Build per-week PLANNED counts for the next 8 weeks for the page.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizonStart = startOfWeek(today, { weekStartsOn: 1 });
  const expected = targets.reduce((s, t) => s + t.targetCount, 0);

  const weeks: { label: string; planned: number; expected: number }[] = [];
  for (let w = 0; w < 8; w++) {
    const ws = addWeeks(horizonStart, w);
    const we = addWeeks(ws, 1);
    const count = await prisma.scheduledWorkout.count({
      where: { userId, scheduledDate: { gte: ws, lt: we }, status: "PLANNED" },
    });
    weeks.push({
      label: `${ws.toISOString().split("T")[0]} → ${addWeeks(ws, 1).toISOString().split("T")[0].replace(/^\d{4}-/, "")}`,
      planned: count,
      expected,
    });
  }

  return (
    <PlanHealthView
      targets={targets.map((t) => ({ id: t.id, name: t.workoutTypeName ?? "?", count: t.targetCount }))}
      weeks={weeks}
    />
  );
}
