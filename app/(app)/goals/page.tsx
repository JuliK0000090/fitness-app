import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoalsView } from "./GoalsView";

export default async function GoalsPage() {
  const session = await requireSession();
  const userId = session.userId;

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
    include: {
      habits: { where: { active: true }, select: { id: true, title: true, icon: true, cadence: true } },
      measurements: { orderBy: { capturedAt: "desc" }, take: 10, select: { capturedAt: true, value: true, unit: true } },
    },
  });

  return (
    <GoalsView
      goals={goals.map((g) => ({
        id: g.id,
        title: g.title ?? g.description ?? "Goal",
        category: g.category ?? "lifestyle",
        visionText: g.visionText,
        status: g.status,
        targetMetric: g.targetMetric,
        targetValue: g.targetValue,
        startValue: g.startValue,
        currentValue: g.currentValue,
        unit: g.unit,
        deadline: g.deadline?.toISOString() ?? null,
        predictedHitDate: g.predictedHitDate?.toISOString() ?? null,
        habits: g.habits.map((h) => ({ id: h.id, title: h.title, icon: h.icon })),
        measurements: g.measurements.map((m) => ({ date: m.capturedAt.toISOString(), value: m.value, unit: m.unit })),
      }))}
    />
  );
}
