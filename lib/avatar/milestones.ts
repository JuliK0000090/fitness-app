import { prisma } from "@/lib/prisma";
import { addWeeks, format } from "date-fns";
import type { PoseId, BackgroundId, OutfitId } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const MILESTONE_INTERVAL_WEEKS = 4;
const MAX_MILESTONES = 5;

function poseForCategory(category: string | null | undefined): PoseId {
  switch (category) {
    case "performance": return "striding";
    case "aesthetic":   return "hands_on_hips";
    default:            return "hands_on_hips";
  }
}

function backgroundForCategory(category: string | null | undefined): BackgroundId {
  switch (category) {
    case "performance": return "gym";
    case "aesthetic":   return "studio";
    default:            return "studio";
  }
}

function outfitForCategory(category: string | null | undefined): OutfitId {
  switch (category) {
    case "performance": return "activewear_set";
    case "aesthetic":   return "little_black_dress";
    default:            return "activewear_set";
  }
}

async function computeCurrentGlow(userId: string): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const workoutsDone = await prisma.scheduledWorkout.count({
    where: { userId, scheduledDate: { gte: sevenDaysAgo }, status: "DONE" },
  });

  if (workoutsDone >= 5) return 3;
  if (workoutsDone >= 3) return 2;
  return 1;
}

export async function generateMilestonesForGoal(goalId: string): Promise<void> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { id: true, userId: true, deadline: true, category: true, status: true },
  });

  if (!goal || goal.status !== "active" || !goal.deadline) return;

  const userId = goal.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const goalDate = new Date(goal.deadline);
  goalDate.setHours(0, 0, 0, 0);
  if (goalDate <= today) return;

  const pose = poseForCategory(goal.category);
  const background = backgroundForCategory(goal.category);
  const outfit = outfitForCategory(goal.category);
  const currentGlow = await computeCurrentGlow(userId);
  const totalDays = (goalDate.getTime() - today.getTime()) / 86400000;

  const milestones: { date: Date; label: string; evolution: number; predicted: boolean }[] = [];
  milestones.push({ date: new Date(today), label: "today", evolution: 0, predicted: false });

  let cursor = addWeeks(today, MILESTONE_INTERVAL_WEEKS);
  while (cursor < goalDate && milestones.length < MAX_MILESTONES - 1) {
    const daysFromToday = (cursor.getTime() - today.getTime()) / 86400000;
    const progress = Math.min(1, daysFromToday / totalDays);
    const evolution = Math.min(4, Math.round(progress * 4)) as 0 | 1 | 2 | 3 | 4;
    milestones.push({ date: new Date(cursor), label: `week ${Math.round(daysFromToday / 7)}`, evolution, predicted: true });
    cursor = addWeeks(cursor, MILESTONE_INTERVAL_WEEKS);
  }
  milestones.push({ date: new Date(goalDate), label: `goal day · ${format(goalDate, "MMM d")}`, evolution: 4, predicted: true });

  await db.avatarMilestone.deleteMany({ where: { userId, goalId: goal.id, predicted: true } });

  await db.avatarMilestone.createMany({
    data: milestones.map((m) => ({
      userId,
      goalId: goal.id,
      date: m.date,
      label: m.label,
      evolution: m.evolution,
      glow: m.label === "today" ? currentGlow : Math.min(3, currentGlow + 1),
      pose,
      outfit,
      background,
      predicted: m.predicted,
      note: m.label === "today" ? "you, as of today." : `you, at ${m.label} — keep going.`,
    })),
  });
}

export async function regenerateMilestonesForUser(userId: string): Promise<void> {
  const goals = await prisma.goal.findMany({
    where: { userId, status: "active", deadline: { not: null } },
    select: { id: true },
  });
  for (const g of goals) {
    await generateMilestonesForGoal(g.id);
  }
}
