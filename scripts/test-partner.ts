/**
 * Track B Phase 2 acceptance test for the accountability partner system.
 *
 * Programmatic round-trip without HTTP:
 *   1. Create user A
 *   2. Insert AccountabilityPartner row PENDING with a synthetic token
 *   3. "Accept" by flipping status (mirrors what /api/partner/accept does)
 *   4. Build buildWeekSummary() and assert privacy contract — first-name
 *      only, no email, no goal text, integer adherence
 *   5. Create a PartnerEncouragement, then attempt a duplicate for the
 *      same week — assert unique constraint blocks it
 *   6. End partnership, verify subsequent summary attempt would skip
 *
 * Run: npx tsx scripts/test-partner.ts
 */

import crypto from "node:crypto";
import { getISOWeek, getYear } from "date-fns";
import { prisma } from "../lib/prisma";
import { buildWeekSummary } from "../lib/partner/share";

let passed = 0;
let failed = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) { console.log(`  PASS  ${name}`); passed++; }
  else { console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); failed++; }
}

async function main() {
  console.log("==> Partner acceptance test\n");

  const userA = await prisma.user.create({
    data: {
      email: `partner-test-a-${Date.now()}@vita.test`,
      name: "Alex Smith",
      onboardingComplete: true,
      timezone: "America/Toronto",
    },
  });

  try {
    // ── Schema: invite + accept ───────────────────────────────────────────
    console.log("[1] Invite + accept lifecycle");
    const inviteToken = crypto.randomBytes(24).toString("base64url");
    const partner = await prisma.accountabilityPartner.create({
      data: {
        userId: userA.id,
        partnerEmail: "best-friend@example.test",
        partnerName: "Sam",
        inviteToken,
        status: "PENDING",
      },
    });
    ok("PENDING partner row created", partner.status === "PENDING");

    const accepted = await prisma.accountabilityPartner.update({
      where: { id: partner.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    ok("Accept transition succeeds", accepted.status === "ACCEPTED" && !!accepted.acceptedAt);

    // ── Privacy contract on the summary builder ──────────────────────────
    console.log("\n[2] Privacy contract on buildWeekSummary");
    const summary = await buildWeekSummary(userA.id);

    ok("first-name only (no last name)", summary.userFirstName === "Alex");
    ok("first-name not the email", !summary.userFirstName.includes("@"));

    // The summary type intentionally does not include weight/measurements/
    // goal text/photos/email/last name. TypeScript would reject any access.
    // Runtime check: the JSON shape has only the safe keys.
    const safeKeys = new Set([
      "userFirstName", "workoutsDone", "workoutsPlanned",
      "habitAdherencePct", "streakDays", "streakAlive",
      "notable", "weekOfYear", "yearNumber",
    ]);
    const actualKeys = Object.keys(summary);
    const leakedKeys = actualKeys.filter((k) => !safeKeys.has(k));
    ok(`only safe keys exposed (got ${actualKeys.length})`, leakedKeys.length === 0,
      leakedKeys.join(", "));
    ok("habitAdherencePct is integer 0..100",
      Number.isInteger(summary.habitAdherencePct) &&
      summary.habitAdherencePct >= 0 && summary.habitAdherencePct <= 100);
    ok("workoutsDone, workoutsPlanned numeric",
      typeof summary.workoutsDone === "number" && typeof summary.workoutsPlanned === "number");

    // ── Encouragement: one-per-week unique constraint ────────────────────
    console.log("\n[3] One-encouragement-per-week constraint");
    const now = new Date();
    const weekOfYear = getISOWeek(now);
    const yearNumber = getYear(now);
    await prisma.partnerEncouragement.create({
      data: { partnerId: partner.id, message: "Proud of you. Keep going.", weekOfYear, yearNumber },
    });
    ok("first encouragement saved", true);

    let dupBlocked = false;
    try {
      await prisma.partnerEncouragement.create({
        data: { partnerId: partner.id, message: "Second this week", weekOfYear, yearNumber },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/Unique constraint/i.test(msg)) dupBlocked = true;
    }
    ok("DB rejects second encouragement same week", dupBlocked);

    // ── End partnership ─────────────────────────────────────────────────
    console.log("\n[4] End partnership");
    const ended = await prisma.accountabilityPartner.update({
      where: { id: partner.id },
      data: { status: "ENDED", endedAt: new Date() },
    });
    ok("ENDED transition", ended.status === "ENDED" && !!ended.endedAt);

    // Confirm a hypothetical weekly-summary scan would skip:
    const acceptedAfterEnd = await prisma.accountabilityPartner.findFirst({
      where: { userId: userA.id, status: "ACCEPTED" },
    });
    ok("no ACCEPTED partner remains for user", acceptedAfterEnd === null);
  } finally {
    // Cascade deletes via the relation
    await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
  }

  console.log(`\n==> ${passed} passed, ${failed} failed`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
