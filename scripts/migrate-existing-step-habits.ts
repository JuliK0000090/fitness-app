/**
 * One-shot: convert existing manual "X steps" / "Y h sleep" habits into
 * wearable-tracked habits for any user with an active HealthIntegration.
 *
 * Default is dry-run — prints the plan and exits without writing.
 * Pass --confirm to actually apply.
 *
 *   DATABASE_URL=<prod> npx tsx scripts/migrate-existing-step-habits.ts
 *   DATABASE_URL=<prod> npx tsx scripts/migrate-existing-step-habits.ts --confirm
 *
 * Idempotent — habits already in WEARABLE_AUTO are skipped.
 */

import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--confirm");

type Plan = {
  habitId: string;
  userEmail: string;
  title: string;
  metricKey: string;
  metricTarget: number;
  metricComparison: "GTE";
};

function inferFromTitle(
  title: string | null,
): Pick<Plan, "metricKey" | "metricTarget" | "metricComparison"> | null {
  if (!title) return null;
  const t = title.toLowerCase();

  const stepsMatch = t.match(/([\d,]+)\s*k?\s*steps/);
  if (stepsMatch) {
    let n = parseInt(stepsMatch[1].replace(/,/g, ""), 10);
    if (/k\s*steps/.test(t) && n < 100) n *= 1000;
    if (Number.isFinite(n) && n > 0) {
      return { metricKey: "steps", metricTarget: n, metricComparison: "GTE" };
    }
  }

  const sleepMatch = t.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?\s*sleep/);
  if (sleepMatch) {
    const n = parseFloat(sleepMatch[1]);
    if (Number.isFinite(n) && n > 0) {
      return { metricKey: "sleepHours", metricTarget: n, metricComparison: "GTE" };
    }
  }

  const activeMatch = t.match(/(\d+)\s*(?:active\s*minutes?|minutes?\s*active)/);
  if (activeMatch) {
    const n = parseInt(activeMatch[1], 10);
    if (Number.isFinite(n) && n > 0) {
      return { metricKey: "activeMinutes", metricTarget: n, metricComparison: "GTE" };
    }
  }

  return null;
}

async function main() {
  const integrations = await prisma.healthIntegration.findMany({
    where: { active: true },
    select: { userId: true, user: { select: { email: true } } },
  });
  const userIds = integrations.map((i) => i.userId);
  if (userIds.length === 0) {
    console.log("No active HealthIntegrations. Nothing to migrate.");
    return;
  }
  console.log(`Found ${userIds.length} user(s) with active HealthIntegration.`);

  const habits = await prisma.habit.findMany({
    where: {
      userId: { in: userIds },
      active: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trackingMode: "MANUAL" as any,
    },
    select: { id: true, userId: true, title: true },
  });

  const emailById = new Map(integrations.map((i) => [i.userId, i.user.email]));
  const plans: Plan[] = [];
  for (const h of habits) {
    const inferred = inferFromTitle(h.title);
    if (!inferred) continue;
    plans.push({
      habitId: h.id,
      userEmail: emailById.get(h.userId) ?? "?",
      title: h.title ?? "",
      ...inferred,
    });
  }

  console.log(`\n${plans.length} habit(s) match a wearable pattern:\n`);
  for (const p of plans) {
    console.log(
      `  ${p.userEmail.padEnd(34)}  "${p.title}"`.padEnd(80) +
      ` → ${p.metricKey} ${p.metricComparison} ${p.metricTarget}`,
    );
  }
  if (plans.length === 0) {
    console.log("  (no candidates)");
    return;
  }

  if (!APPLY) {
    console.log(`\nDRY RUN — no changes written. Re-run with --confirm to apply.`);
    return;
  }

  console.log(`\nApplying...`);
  let ok = 0;
  for (const p of plans) {
    await prisma.habit.update({
      where: { id: p.habitId },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trackingMode: "WEARABLE_AUTO" as any,
        metricKey: p.metricKey,
        metricTarget: p.metricTarget,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metricComparison: p.metricComparison as any,
      },
    });
    ok++;
  }
  console.log(`Done. Migrated ${ok}/${plans.length} habits.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
