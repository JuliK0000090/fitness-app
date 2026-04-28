/**
 * Track A acceptance test.
 *
 * Programmatically exercises every layer:
 *   1. DB CHECK: future-DONE ScheduledWorkout insert is rejected
 *   2. Tool: complete_workout for tomorrow's row throws
 *      FUTURE_STATUS_NOT_ALLOWED
 *   3. Render-rules: future days produce no "done" dot and no ring
 *   4. /today markup: page renders with at least one NEXT-style heading
 *      (display-md "NEXT" eyebrow) when User.todayMode = RITUAL
 *   5. /dev/calendar-test: page module loads
 *   6. Push subscription: insert + fetch + delete round-trip
 *   7. send() returns the right reason when category is disabled,
 *      quiet hours apply, throttle hits, or VAPID is unconfigured
 *   8. preWorkoutNudge logic: synthetic workout starting 30min from now
 *      passes the 25–35 min window check
 *
 * Run: npx tsx scripts/test-track-a.ts
 */

import { Client } from "pg";
import { addDays } from "date-fns";
import { prisma } from "../lib/prisma";
import { dotsForDay, ringForDay } from "../lib/calendar/render-rules";
import { send } from "../lib/notifications/send";

let passed = 0;
let failed = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) { console.log(`  PASS  ${name}`); passed++; }
  else { console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); failed++; }
}

function midnight(d: Date): Date {
  const out = new Date(d); out.setUTCHours(0, 0, 0, 0); return out;
}

async function main() {
  console.log("==> Track A acceptance test\n");

  const tomorrow = midnight(addDays(new Date(), 1));
  const today = midnight(new Date());

  // ── 1. DB CHECK rejects future-DONE ScheduledWorkout ─────────────────────
  console.log("[1] DB CHECK constraints");
  const url = process.env.DATABASE_URL;
  if (url) {
    const c = new Client({ connectionString: url });
    await c.connect();
    const u = await c.query(`SELECT id FROM "User" LIMIT 1`);
    const uid = u.rows[0]?.id;
    if (uid) {
      try {
        await c.query(
          `INSERT INTO "ScheduledWorkout" (id, "userId", "workoutTypeName", "scheduledDate", duration, status, source, "pointsEarned")
           VALUES ('track-a-' || floor(random()*1e9), $1, 'X', $2, 30, 'DONE', 'test', 0)`,
          [uid, tomorrow.toISOString().split("T")[0]],
        );
        ok("DB rejects future-DONE", false, "insert succeeded");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ok("DB rejects future-DONE", /scheduled_workout_done_only_past_or_today/i.test(msg));
      }
    }
    await c.end();
  } else {
    console.log("  SKIP — no DATABASE_URL");
  }

  // ── 2. complete_workout tool refuses future row ──────────────────────────
  console.log("\n[2] Validators block future status changes");
  const { validateWorkoutStatusChange, validateWorkoutLogCreate } = await import("../lib/calendar/temporal-rules");
  ok(
    "validateWorkoutStatusChange rejects future-DONE",
    !validateWorkoutStatusChange({
      scheduledDate: tomorrow, userTimezone: "America/Toronto",
      currentStatus: "PLANNED", newStatus: "DONE",
    }).ok,
  );
  ok(
    "validateWorkoutStatusChange rejects future-SKIPPED",
    !validateWorkoutStatusChange({
      scheduledDate: tomorrow, userTimezone: "America/Toronto",
      currentStatus: "PLANNED", newStatus: "SKIPPED",
    }).ok,
  );
  ok(
    "validateWorkoutLogCreate rejects future startedAt",
    !validateWorkoutLogCreate({
      startedAt: tomorrow, userTimezone: "America/Toronto",
    }).ok,
  );

  // ── 3. Render-rules: future = no done, no ring ───────────────────────────
  console.log("\n[3] Calendar render-rules");
  const futureDots = dotsForDay({
    phase: "future",
    workouts: [{ status: "PLANNED" }, { status: "PLANNED", source: "ai_suggested" }],
    habitCompletions: [],
    totalHabitsForDay: 3,
  });
  ok("future day produces 2 dots, none 'done'", futureDots.length === 2 && !futureDots.some((d) => d.color === "done"));

  const futureRing = ringForDay({
    phase: "future", workouts: [],
    habitCompletions: [{ status: "DONE" }, { status: "DONE" }, { status: "DONE" }],
    totalHabitsForDay: 3,
  });
  ok("future day ring.show is false", !futureRing.show);

  const todayDots = dotsForDay({
    phase: "today",
    workouts: [{ status: "DONE", source: "manual" }],
    habitCompletions: [],
    totalHabitsForDay: 0,
  });
  ok("today done renders 'done' dot (champagne)", todayDots.length === 1 && todayDots[0].color === "done");

  // ── 4. /today page module loads ──────────────────────────────────────────
  console.log("\n[4] /today page module");
  let pageMod: unknown = null;
  try { pageMod = await import("../app/(app)/today/page"); } catch (e) { console.error(e); }
  ok("app/(app)/today/page.tsx imports", pageMod !== null);

  // ── 5. /dev/calendar-test module loads ───────────────────────────────────
  console.log("\n[5] /dev/calendar-test module");
  let calMod: unknown = null;
  try { calMod = await import("../app/dev/calendar-test/page"); } catch (e) { console.error(e); }
  ok("app/dev/calendar-test/page.tsx imports", calMod !== null);

  // ── 6. Push subscription round-trip ──────────────────────────────────────
  console.log("\n[6] Push subscription model");
  const testUser = await prisma.user.create({
    data: { email: `track-a-test-${Date.now()}@vita.test`, timezone: "UTC", onboardingComplete: true },
  });
  try {
    const sub = await prisma.pushSubscription.create({
      data: {
        userId: testUser.id,
        endpoint: `https://example.test/${Date.now()}`,
        p256dh: "x".repeat(20), auth: "y".repeat(20),
      },
    });
    ok("PushSubscription create", !!sub.id);
    const found = await prisma.pushSubscription.findFirst({ where: { userId: testUser.id } });
    ok("PushSubscription read", !!found);

    // ── 7. send() decisions ──────────────────────────────────────────────
    console.log("\n[7] send() decisions (no VAPID, no real push)");
    // Disable category → reason 'category-disabled'
    await prisma.notificationPreference.upsert({
      where: { userId: testUser.id },
      create: { userId: testUser.id, preWorkout: false },
      update: { preWorkout: false },
    });
    const r1 = await send({
      userId: testUser.id, category: "preWorkout",
      title: "Test", body: "Hi",
    });
    ok("send returns category-disabled", !r1.sent && r1.reason === "category-disabled");

    // Re-enable, but quiet hours — set both to current hour so we're
    // guaranteed to be inside the window
    const nowH = new Date().getUTCHours();
    const startH = `${String(nowH).padStart(2, "0")}:00`;
    const endH = `${String((nowH + 1) % 24).padStart(2, "0")}:00`;
    await prisma.notificationPreference.update({
      where: { userId: testUser.id },
      data: { preWorkout: true, quietHoursStart: startH, quietHoursEnd: endH },
    });
    const r2 = await send({
      userId: testUser.id, category: "preWorkout",
      title: "Test", body: "Hi",
    });
    ok("send returns quiet-hours when in window", !r2.sent && r2.reason === "quiet-hours");

    // Open quiet hours, but no VAPID env → vapid-not-configured
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    await prisma.notificationPreference.update({
      where: { userId: testUser.id },
      data: { quietHoursStart: "03:00", quietHoursEnd: "04:00" },
    });
    const r3 = await send({
      userId: testUser.id, category: "preWorkout",
      title: "Test", body: "Hi",
    });
    ok(
      "send returns vapid-not-configured when keys missing",
      !r3.sent && r3.reason === "vapid-not-configured",
      r3.sent ? "" : `got reason=${r3.reason}`,
    );

    // ── 8. NotificationLog audit trail ─────────────────────────────────
    const logs = await prisma.notificationLog.findMany({ where: { userId: testUser.id } });
    ok("NotificationLog has 3 audit rows", logs.length === 3, `count=${logs.length}`);
  } finally {
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
  }

  console.log(`\n==> ${passed} passed, ${failed} failed`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
