/**
 * One-time migration: rename any Goal whose title contains
 * "Victoria's Secret" (any spelling) to "Lean and strong — lifetime goal".
 *
 *   npx tsx scripts/rename-vs-goal.ts            # dry-run, prints plan
 *   npx tsx scripts/rename-vs-goal.ts --confirm  # applies
 *
 * Idempotent. Safe to re-run. Only updates the title field — leaves
 * habits, workouts, deadlines untouched.
 */

import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--confirm");
const NEW_TITLE = "Lean and strong — lifetime goal";

const VS_PATTERN = /victoria'?s\s+secret/i;

async function main() {
  const candidates = await prisma.goal.findMany({
    where: {
      OR: [
        { title: { contains: "Victoria", mode: "insensitive" } },
        { description: { contains: "Victoria", mode: "insensitive" } },
      ],
    },
    select: { id: true, userId: true, title: true, description: true },
  });

  const matches = candidates.filter(
    (g) =>
      (g.title && VS_PATTERN.test(g.title)) ||
      (g.description && VS_PATTERN.test(g.description)),
  );

  if (matches.length === 0) {
    console.log("No Victoria's Secret goals found. Nothing to do.");
    return;
  }

  console.log(`Found ${matches.length} goal(s) with VS phrasing:\n`);
  for (const g of matches) {
    console.log(`  ${g.id} · user=${g.userId.slice(0, 8)}\n     before: ${g.title ?? "(no title)"}\n     after:  ${NEW_TITLE}`);
  }

  if (!APPLY) {
    console.log(`\nDRY RUN — re-run with --confirm to apply.`);
    return;
  }

  console.log(`\nApplying...`);
  let ok = 0;
  for (const g of matches) {
    await prisma.goal.update({
      where: { id: g.id },
      data: { title: NEW_TITLE },
    });
    ok++;
  }
  console.log(`Done. Updated ${ok} goal(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
