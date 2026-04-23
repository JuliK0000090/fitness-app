/**
 * scripts/dedupe-habits.ts
 *
 * Finds habits with duplicate titles (per user, case-insensitive) and archives
 * all but the most-recently-used one (most completions → most recent createdAt).
 *
 * Run with:
 *   npx tsx scripts/dedupe-habits.ts [--dry-run]
 *
 * Safe to run multiple times — idempotent.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

function normalize(title: string | null): string {
  return (title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  console.log(`[dedupe-habits] ${DRY_RUN ? "DRY RUN — " : ""}starting`);

  const habits = await prisma.habit.findMany({
    where: { active: true },
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      _count: { select: { completions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by userId + normalized title
  const groups = new Map<string, typeof habits>();
  for (const h of habits) {
    const key = `${h.userId}::${normalize(h.title)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(h);
  }

  let archiveCount = 0;
  for (const [key, group] of groups) {
    if (group.length <= 1) continue;

    // Keep the one with the most completions; ties broken by latest createdAt
    group.sort((a, b) => {
      const diff = b._count.completions - a._count.completions;
      return diff !== 0 ? diff : b.createdAt.getTime() - a.createdAt.getTime();
    });

    const [keep, ...archive] = group;
    console.log(
      `[dedupe-habits] key="${key}" keeping id=${keep.id} (${keep._count.completions} completions), archiving ${archive.map((h) => h.id).join(", ")}`
    );

    if (!DRY_RUN) {
      await prisma.habit.updateMany({
        where: { id: { in: archive.map((h) => h.id) } },
        data: { active: false },
      });
    }
    archiveCount += archive.length;
  }

  console.log(`[dedupe-habits] done — ${DRY_RUN ? "would archive" : "archived"} ${archiveCount} duplicate habit(s)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
