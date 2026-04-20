import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LibraryView } from "./LibraryView";

export default async function LibraryPage() {
  const session = await requireSession();
  const userId = session.userId;

  const [workoutTypes, recentWorkouts] = await Promise.all([
    prisma.workoutType.findMany({
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
  ]);

  // Favorite workouts (most logged)
  const workoutFreq: Record<string, { name: string; count: number; lastDuration: number }> = {};
  for (const w of recentWorkouts) {
    if (!workoutFreq[w.workoutName]) {
      workoutFreq[w.workoutName] = { name: w.workoutName, count: 0, lastDuration: w.durationMin };
    }
    workoutFreq[w.workoutName].count++;
  }
  const favorites = Object.values(workoutFreq).sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <LibraryView
      workoutTypes={workoutTypes.map((t) => ({ id: t.id, name: t.name, category: t.category ?? "", description: t.description ?? "" }))}
      favorites={favorites}
      recentWorkouts={recentWorkouts.map((w) => ({
        id: w.id,
        name: w.workoutName,
        durationMin: w.durationMin,
        intensity: w.intensity ?? undefined,
        startedAt: w.startedAt.toISOString(),
      }))}
    />
  );
}
