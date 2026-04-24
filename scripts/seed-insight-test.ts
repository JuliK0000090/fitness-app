/**
 * Insight test seed script
 *
 * Usage: npx tsx scripts/seed-insight-test.ts --insight=1 --email=test@example.com
 *
 * Creates synthetic health/habit data designed to trigger a specific insight.
 * Run evaluateInsights manually after seeding to verify the right message fires.
 *
 * Insights:
 *   1 = cross_domain_catch
 *   2 = streak_celebration
 *   3 = glp1_protein_check
 *   4 = trajectory_math
 *   5 = travel_preemption
 *   6 = overtraining_warning
 *   7 = pattern_spotter
 *   8 = event_countdown
 *   9 = quiet_observation
 *  10 = cycle_aware_reframe
 */

import { PrismaClient } from "@prisma/client";
import { evaluateInsights } from "@/lib/jobs/insights";

const prisma = new PrismaClient();

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace("--", "").split("=") as [string, string])
);
const insightNum = parseInt(args.insight ?? "1");
const email = args.email ?? "test-insight@vita.test";

async function main() {
  console.log(`[seed] targeting insight #${insightNum} for ${email}`);

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}. Create the user first.`);
    process.exit(1);
  }

  const today = new Date();
  const userId = user.id;

  async function upsertHealthDay(daysAgo: number, metric: string, value: number) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    await prisma.healthDaily.upsert({
      where: { userId_date_metric: { userId, date: d, metric } },
      create: { userId, date: d, metric, value, unit: "", source: "seed", trust: 100 },
      update: { value },
    });
  }

  switch (insightNum) {
    case 1: // cross_domain_catch — rising resting HR + deadline keyword in recent message
      for (let i = 0; i < 7; i++) {
        await upsertHealthDay(i, "heartRateResting", 62 + i); // rising trend
      }
      // Add a message mentioning deadline
      const conv = await prisma.conversation.findFirst({ where: { userId } }) ??
        await prisma.conversation.create({ data: { userId, title: "Insight test" } });
      await prisma.message.create({
        data: { conversationId: conv.id, role: "user", content: "I have a big launch deadline on Friday, really stressed." },
      });
      console.log("[seed] Set rising resting HR + deadline message");
      break;

    case 2: // streak_celebration — 7+ consecutive all-habits days + high readiness
      for (let i = 0; i < 8; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        await prisma.dailyLedger.upsert({
          where: { userId_date: { userId, date: d } },
          create: { userId, date: d, allComplete: true, habitsCompleted: 5, habitsTotal: 5, points: 100 },
          update: { allComplete: true },
        });
        await upsertHealthDay(i, "readinessScore", 72 + Math.random() * 10);
      }
      console.log("[seed] Set 8-day all-habits streak + high readiness");
      break;

    case 3: // glp1_protein_check — active GLP-1 profile + low protein
      await (prisma as any).gLP1Profile.upsert({
        where: { userId },
        create: { userId, active: true, medication: "semaglutide", proteinTargetG: 140, resistanceMinTarget: 150 },
        update: { active: true, proteinTargetG: 140 },
      });
      for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        await (prisma as any).nutritionLog.upsert({
          where: { userId_date: { userId, date: d } },
          create: { userId, date: d, proteinG: 68 }, // well below 140g target
          update: { proteinG: 68 },
        });
      }
      console.log("[seed] Set GLP-1 active + low protein logs");
      break;

    case 4: // trajectory_math — active goal behind schedule
      const goal = await prisma.goal.findFirst({ where: { userId, status: "active" } });
      if (goal) {
        const deadline = new Date(today);
        deadline.setDate(deadline.getDate() + 60);
        await prisma.goal.update({
          where: { id: goal.id },
          data: { startValue: 80, currentValue: 79, targetValue: 70, deadline, unit: "kg" },
        });
        console.log("[seed] Set goal behind schedule");
      } else {
        console.log("[seed] No active goal found — create one first");
      }
      break;

    case 5: // travel_preemption — upcoming avatar event in 2 days
      const travelDate = new Date(today);
      travelDate.setDate(travelDate.getDate() + 2);
      await (prisma as any).avatarEvent.create({
        data: {
          userId,
          title: "Business trip — London",
          date: travelDate,
          outfit: "activewear_set",
          background: "hotel",
          pose: "hands_on_hips",
        },
      });
      console.log("[seed] Created upcoming event in 2 days");
      break;

    case 6: // overtraining_warning — user asked for more + HRV below baseline
      const conv2 = await prisma.conversation.findFirst({ where: { userId } }) ??
        await prisma.conversation.create({ data: { userId, title: "Insight test" } });
      await prisma.message.create({
        data: { conversationId: conv2.id, role: "user", content: "Can you add another workout session this week? I want to push harder." },
      });
      for (let i = 0; i < 30; i++) {
        await upsertHealthDay(i, "hrvMs", i < 7 ? 28 : 55); // recent HRV low vs 30-day baseline of ~55
      }
      console.log("[seed] Set more-workouts request + low HRV");
      break;

    case 9: // quiet_observation — consecutive open days
      for (let i = 0; i < 6; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        await prisma.notification.create({
          data: { userId, type: "open_signal", title: "Open", body: "Day open signal", createdAt: d },
        }).catch(() => {}); // ignore if already exists
      }
      console.log("[seed] Set 6 consecutive open-day notifications");
      break;

    default:
      console.log(`[seed] Insight #${insightNum} requires manual setup or isn't seeded yet.`);
  }

  console.log("\n[seed] Running evaluateInsights...");
  const fired = await evaluateInsights(userId);
  if (fired) {
    console.log(`[seed] Insight fired: ${fired}`);
  } else {
    console.log("[seed] No insight fired — check trigger conditions.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
