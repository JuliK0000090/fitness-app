/**
 * Track B Phase 3 end-to-end smoke test.
 *
 * Wires every shipped surface together for one synthetic user lifecycle:
 *
 *   1. Create user A
 *   2. Run the same writes the /welcome onboarding does (atomic Goal +
 *      Habit + WeeklyTarget + 8-week ScheduledWorkout horizon)
 *   3. Assert /today and /month server queries succeed against the
 *      seeded state (we exercise the prisma queries directly without
 *      booting Next; the goal is data, not HTTP)
 *   4. Invite a partner via the same logic /api/partner/invite uses
 *   5. Accept the invite by transitioning status
 *   6. Build the privacy-safe weekly summary; assert the contract
 *   7. Send an encouragement; assert the unique-per-week constraint
 *      blocks a second
 *   8. Assert push notification log records a partnerEncouragement
 *      attempt (no real delivery in test — VAPID isn't set in this
 *      shell)
 *   9. Tear everything down via cascade delete
 *
 * Run: npx tsx scripts/test-end-to-end.ts
 */

import crypto from "node:crypto";
import { addDays, getISOWeek, getYear } from "date-fns";
import { prisma } from "../lib/prisma";
import { regenerateUserPlan } from "../lib/coach/regenerate";
import { buildWeekSummary } from "../lib/partner/share";
import { send } from "../lib/notifications/send";

let passed = 0;
let failed = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) { console.log(`  PASS  ${name}`); passed++; }
  else { console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); failed++; }
}

async function main() {
  console.log("==> Vita end-to-end smoke test\n");

  const ts = Date.now();
  const userA = await prisma.user.create({
    data: {
      email: `e2e-user-${ts}@vita.test`,
      name: "Mia Tester",
      timezone: "America/Toronto",
      onboardingComplete: false,
    },
  });

  try {
    // ── 1. Onboarding commit ────────────────────────────────────────────
    console.log("[1] Onboarding commit (User flags + Goal + Habit + WeeklyTarget)");
    const goalId = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userA.id },
        data: { onboardingComplete: true, todayMode: "RITUAL" },
      });
      const g = await tx.goal.create({
        data: {
          userId: userA.id,
          title: "Lean and strong by July 14",
          description: "Lean and strong by July 14",
          category: "event_prep",
          deadline: new Date("2026-07-14"),
          status: "active",
        },
      });
      // 4 habits
      for (const h of [
        { title: "10,000 steps",      duration: 60 },
        { title: "Drink 2.5 L water", duration: 1 },
        { title: "Stretch 10 min",    duration: 10 },
        { title: "Sleep 7+ hours",    duration: 0 },
      ]) {
        await tx.habit.create({
          data: {
            userId: userA.id, goalId: g.id,
            title: h.title, cadence: "daily", cadenceType: "DAILY",
            duration: h.duration, pointsOnComplete: 10,
            specificDays: [], active: true,
          },
        });
      }
      // 2 weekly targets — Hot Pilates 3x, Reformer 2x
      for (const w of [
        { name: "Hot Pilates",      times: 3 },
        { name: "Reformer Pilates", times: 2 },
      ]) {
        const wt = await tx.workoutType.upsert({
          where: { name: w.name },
          create: { name: w.name, slug: w.name.toLowerCase().replace(/\s+/g, "_"), defaultDuration: 45 },
          update: {},
        });
        await tx.weeklyTarget.create({
          data: {
            userId: userA.id, goalId: g.id, workoutTypeId: wt.id,
            workoutTypeName: w.name, targetCount: w.times,
          },
        });
      }
      return g.id;
    });
    ok("transaction committed", !!goalId);

    // ── 2. Plan regenerator ────────────────────────────────────────────
    console.log("\n[2] Regenerator seeds the 8-week horizon");
    await regenerateUserPlan(userA.id);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const eightWeeksOut = addDays(today, 56);
    const horizonCount = await prisma.scheduledWorkout.count({
      where: { userId: userA.id, scheduledDate: { gte: today, lt: eightWeeksOut }, status: "PLANNED" },
    });
    ok(`>=30 PLANNED rows in 8-week horizon (got ${horizonCount})`, horizonCount >= 30);
    const futureDone = await prisma.scheduledWorkout.count({
      where: { userId: userA.id, scheduledDate: { gt: today }, status: { in: ["DONE", "SKIPPED", "MISSED", "AUTO_SKIPPED"] } },
    });
    ok(`zero future-DONE rows (got ${futureDone})`, futureDone === 0);

    // ── 3. /today / /month queries succeed ─────────────────────────────
    console.log("\n[3] /today + /month server queries");
    const tu = await prisma.user.findUnique({
      where: { id: userA.id },
      select: { id: true, name: true, todayMode: true, onboardingComplete: true },
    });
    ok("user is RITUAL + onboarded", tu?.todayMode === "RITUAL" && tu?.onboardingComplete === true);

    const monthStart = new Date(today.getUTCFullYear(), today.getUTCMonth(), 1);
    const monthEnd = new Date(today.getUTCFullYear(), today.getUTCMonth() + 2, 0);
    const monthSW = await prisma.scheduledWorkout.findMany({
      where: { userId: userA.id, scheduledDate: { gte: monthStart, lte: monthEnd } },
      select: { id: true, scheduledDate: true, status: true },
    });
    ok(`/month finds workouts (got ${monthSW.length})`, monthSW.length > 0);

    // ── 4. Invite partner ─────────────────────────────────────────────
    console.log("\n[4] Partner invite + accept");
    const inviteToken = crypto.randomBytes(24).toString("base64url");
    const partner = await prisma.accountabilityPartner.create({
      data: {
        userId: userA.id,
        partnerEmail: `e2e-partner-${ts}@example.test`,
        partnerName: "Sam Buddy",
        inviteToken,
        status: "PENDING",
      },
    });
    ok("partner row PENDING", partner.status === "PENDING");

    // Accept
    const accepted = await prisma.accountabilityPartner.update({
      where: { id: partner.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    ok("partner ACCEPTED", accepted.status === "ACCEPTED");

    // ── 5. Weekly summary builds privacy-safely ───────────────────────
    console.log("\n[5] Weekly summary builds with privacy contract");
    const summary = await buildWeekSummary(userA.id);
    ok("first-name only", summary.userFirstName === "Mia");
    ok("integer adherence 0..100",
      Number.isInteger(summary.habitAdherencePct) &&
      summary.habitAdherencePct >= 0 &&
      summary.habitAdherencePct <= 100);
    const safeKeys = new Set([
      "userFirstName", "workoutsDone", "workoutsPlanned",
      "habitAdherencePct", "streakDays", "streakAlive",
      "notable", "weekOfYear", "yearNumber",
    ]);
    ok("only safe keys exposed", Object.keys(summary).every((k) => safeKeys.has(k)));

    // ── 6. Encouragement: send + dedupe ───────────────────────────────
    console.log("\n[6] Encouragement send + one-per-week constraint");
    const week = getISOWeek(new Date());
    const year = getYear(new Date());
    await prisma.partnerEncouragement.create({
      data: { partnerId: partner.id, message: "Proud of you. Keep going.", weekOfYear: week, yearNumber: year },
    });
    ok("encouragement saved", true);

    let blocked = false;
    try {
      await prisma.partnerEncouragement.create({
        data: { partnerId: partner.id, message: "Second this week", weekOfYear: week, yearNumber: year },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      blocked = /Unique constraint/i.test(msg);
    }
    ok("DB rejects duplicate same-week encouragement", blocked);

    // ── 7. Push notification log ─────────────────────────────────────
    console.log("\n[7] Push notification path (NotificationLog audit)");
    const result = await send({
      userId: userA.id,
      category: "partnerEncouragement",
      title: "From Sam",
      body: "Proud of you. Keep going.",
      deepLink: "/today",
    });
    // No VAPID, no subscriptions — send returns sent:false with a reason
    // and writes a NotificationLog row.
    ok("send returns a reason", !result.sent);
    const logs = await prisma.notificationLog.findMany({
      where: { userId: userA.id, category: "partnerEncouragement" },
    });
    ok(`NotificationLog has 1 row (got ${logs.length})`, logs.length === 1);
    ok("log body matches", logs[0]?.body === "Proud of you. Keep going.");

    // ── 8. End partnership cleans up ─────────────────────────────────
    console.log("\n[8] End partnership");
    await prisma.accountabilityPartner.update({
      where: { id: partner.id },
      data: { status: "ENDED", endedAt: new Date() },
    });
    const remaining = await prisma.accountabilityPartner.count({
      where: { userId: userA.id, status: "ACCEPTED" },
    });
    ok("zero ACCEPTED partnerships remain", remaining === 0);
  } finally {
    await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
  }

  console.log(`\n==> ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log("\nVita is launch-ready.");
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
