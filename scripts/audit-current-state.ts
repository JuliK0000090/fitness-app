/**
 * Phase-1 audit for the Track A retention upgrade. Read-only.
 *
 * Five sections:
 *   1. Calendar/timeline data integrity (per-user-tz aware)
 *   2. /today page composition + queries
 *   3. Status enum names
 *   4. Notifications infrastructure (web-push, VAPID, models, SW)
 *   5. User timezone coverage
 *
 * Run: npx tsx scripts/audit-current-state.ts
 *      DATABASE_URL=<prod> npx tsx scripts/audit-current-state.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { prisma } from "../lib/prisma";

function bar() { console.log("─".repeat(72)); }
function head(s: string) { bar(); console.log(s); bar(); }

function userTodayStr(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC" }).format(new Date());
}

async function main() {
  const repoRoot = join(__dirname, "..");

  // ─────────────────────────────────────────────────────────────────────────
  head("[1] Calendar / timeline data integrity (per-user-tz aware)");

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, timezone: true },
  });
  const userToday = new Map<string, string>();
  for (const u of users) userToday.set(u.id, userTodayStr(u.timezone || "UTC"));
  console.log(`Users: ${users.length}`);

  // 1a. HabitCompletion future
  const futureHc = await prisma.habitCompletion.findMany({
    select: { id: true, userId: true, date: true, status: true, source: true },
    take: 50,
    orderBy: { date: "desc" },
  });
  const hcViolations = futureHc.filter((r) => {
    const today = userToday.get(r.userId);
    return today && r.date.toISOString().split("T")[0] > today;
  });
  console.log(`HabitCompletion rows with date > user-local-today: ${hcViolations.length}`);
  for (const v of hcViolations.slice(0, 10)) {
    const u = users.find((x) => x.id === v.userId);
    console.log(`   ${v.date.toISOString().split("T")[0]} u=${u?.email ?? v.userId.slice(0, 8)} status=${v.status} src=${v.source}`);
  }

  // 1b. ScheduledWorkout future-completion
  const completionStatuses = ["DONE", "SKIPPED", "MISSED", "AUTO_SKIPPED"] as const;
  const allSW = await prisma.scheduledWorkout.findMany({
    select: { id: true, userId: true, scheduledDate: true, status: true, workoutTypeName: true },
  });
  const swFutureCompletion = allSW.filter((r) => {
    const today = userToday.get(r.userId);
    return today && r.scheduledDate.toISOString().split("T")[0] > today
      && (completionStatuses as readonly string[]).includes(r.status);
  });
  console.log(`ScheduledWorkout future-date + completion-status: ${swFutureCompletion.length}`);
  for (const v of swFutureCompletion.slice(0, 10)) {
    const u = users.find((x) => x.id === v.userId);
    console.log(`   ${v.scheduledDate.toISOString().split("T")[0]} u=${u?.email ?? v.userId.slice(0, 8)} ${v.workoutTypeName} status=${v.status}`);
  }

  // 1c. ScheduledWorkout past-PLANNED
  const swPastPlanned = allSW.filter((r) => {
    const today = userToday.get(r.userId);
    return today && r.scheduledDate.toISOString().split("T")[0] < today && r.status === "PLANNED";
  });
  console.log(`ScheduledWorkout past-date + status=PLANNED: ${swPastPlanned.length}`);
  for (const v of swPastPlanned.slice(0, 10)) {
    const u = users.find((x) => x.id === v.userId);
    console.log(`   ${v.scheduledDate.toISOString().split("T")[0]} u=${u?.email ?? v.userId.slice(0, 8)} ${v.workoutTypeName}`);
  }

  // 1d. WorkoutLog future startedAt (the bug class that caused phantom checks)
  const allLogs = await prisma.workoutLog.findMany({
    select: { id: true, userId: true, startedAt: true, workoutName: true, source: true },
  });
  const logFuture = allLogs.filter((r) => {
    const today = userToday.get(r.userId);
    return today && r.startedAt.toISOString().split("T")[0] > today;
  });
  console.log(`WorkoutLog with startedAt > user-local-today: ${logFuture.length}`);
  for (const v of logFuture.slice(0, 10)) {
    const u = users.find((x) => x.id === v.userId);
    console.log(`   ${v.startedAt.toISOString().split("T")[0]} u=${u?.email ?? v.userId.slice(0, 8)} "${v.workoutName}" src=${v.source}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  head("\n[2] /today page composition");
  const todayPage = readFileSync(join(repoRoot, "app/(app)/today/page.tsx"), "utf8");
  const ritualView = existsSync(join(repoRoot, "app/(app)/today/RitualView.tsx"));
  const todayView = existsSync(join(repoRoot, "app/(app)/today/TodayView.tsx"));
  console.log("Files:");
  console.log(`  app/(app)/today/page.tsx          (${todayPage.split("\n").length} lines)`);
  console.log(`  app/(app)/today/RitualView.tsx    (${ritualView ? "present" : "MISSING"})`);
  console.log(`  app/(app)/today/TodayView.tsx     (${todayView ? "present" : "MISSING"})`);

  const queryHits = (todayPage.match(/prisma\.\w+\.\w+\(/g) || []).slice(0, 12);
  console.log(`Prisma calls in /today/page.tsx (first 12):`);
  for (const q of queryHits) console.log(`  ${q}`);

  const todayMode = await prisma.user.findMany({
    select: { id: true, email: true },
    where: { deletedAt: null },
    take: 8,
  });
  // todayMode is on User — single column. Show distribution.
  const tmDist = await prisma.$queryRawUnsafe<Array<{ mode: string; n: bigint }>>(
    `SELECT "todayMode" AS mode, COUNT(*) AS n FROM "User" WHERE "deletedAt" IS NULL GROUP BY "todayMode"`,
  );
  console.log(`User.todayMode distribution:`);
  for (const r of tmDist) console.log(`  ${r.mode}: ${r.n}`);
  void todayMode;

  const onboardingExists = existsSync(join(repoRoot, "app/onboarding/page.tsx"));
  const welcomeExists = existsSync(join(repoRoot, "app/welcome/page.tsx"));
  console.log(`Onboarding routes:`);
  console.log(`  app/onboarding/page.tsx   ${onboardingExists ? "present" : "MISSING"}`);
  console.log(`  app/welcome/page.tsx      ${welcomeExists ? "present" : "MISSING"}`);

  // ─────────────────────────────────────────────────────────────────────────
  head("\n[3] Status enum values from prisma/schema.prisma");
  const schema = readFileSync(join(repoRoot, "prisma/schema.prisma"), "utf8");
  const enumPattern = /enum (\w+)\s*\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = enumPattern.exec(schema)) !== null) {
    const name = m[1];
    const values = m[2]
      .split("\n").map((s) => s.replace(/\/\/.*$/, "").trim()).filter(Boolean);
    if (/Status|Source/.test(name)) {
      console.log(`  ${name}: ${values.join(" | ")}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  head("\n[4] Notifications infrastructure");

  // Models present
  const models = ["PushSubscription", "NotificationPreference", "NotificationLog", "IntegrityAlert"];
  for (const mdl of models) {
    const present = new RegExp(`^model ${mdl}\\b`, "m").test(schema);
    console.log(`  Prisma model ${mdl.padEnd(24)} ${present ? "present" : "MISSING"}`);
  }

  // SW push handler
  const sw = readFileSync(join(repoRoot, "public/sw.js"), "utf8");
  const hasPushHandler = /addEventListener\(\s*['"]push/.test(sw);
  const hasNotifClick = /addEventListener\(\s*['"]notificationclick/.test(sw);
  console.log(`  public/sw.js push handler         ${hasPushHandler ? "present" : "MISSING"}`);
  console.log(`  public/sw.js notificationclick    ${hasNotifClick ? "present" : "MISSING"}`);

  // Push API endpoints
  console.log(`  app/api/push/subscribe/route.ts   ${existsSync(join(repoRoot, "app/api/push/subscribe/route.ts")) ? "present" : "MISSING"}`);
  console.log(`  app/api/push/send/route.ts        ${existsSync(join(repoRoot, "app/api/push/send/route.ts")) ? "present" : "MISSING"}`);
  console.log(`  lib/notifications/send.ts         ${existsSync(join(repoRoot, "lib/notifications/send.ts")) ? "present" : "MISSING"}`);

  // VAPID env presence
  const hasVapidPublic = !!process.env.VAPID_PUBLIC_KEY || !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const hasVapidPrivate = !!process.env.VAPID_PRIVATE_KEY;
  const hasVapidSubject = !!process.env.VAPID_SUBJECT;
  console.log(`  VAPID_PUBLIC_KEY env              ${hasVapidPublic ? "set" : "MISSING"}`);
  console.log(`  VAPID_PRIVATE_KEY env             ${hasVapidPrivate ? "set" : "MISSING"}`);
  console.log(`  VAPID_SUBJECT env                 ${hasVapidSubject ? "set" : "MISSING (default mailto:admin@vita.app used by send route)"}`);

  // web-push package
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const wp = pkg.dependencies?.["web-push"] ?? pkg.devDependencies?.["web-push"];
  const wpTypes = pkg.devDependencies?.["@types/web-push"] ?? pkg.dependencies?.["@types/web-push"];
  console.log(`  web-push                          ${wp ?? "MISSING"}`);
  console.log(`  @types/web-push                   ${wpTypes ?? "MISSING"}`);

  // Inngest schedulers we'd add for Track A
  const targets = ["preWorkoutNudge", "streakSaveNudge", "weeklyReviewNudge", "reactiveAdjustmentSent"];
  console.log(`  Existing nudge Inngest functions:`);
  for (const t of targets) {
    const found = await (async () => {
      const cmd = await import("node:child_process");
      try {
        const out = cmd.execSync(`grep -rln "${t}" lib/jobs/ app/api/inngest/ 2>/dev/null || true`, { encoding: "utf8", cwd: repoRoot });
        return out.trim().split("\n").filter(Boolean)[0] ?? null;
      } catch { return null; }
    })();
    console.log(`    ${t.padEnd(28)} ${found ?? "missing"}`);
  }

  // Live PushSubscription rows
  const subCount = await prisma.pushSubscription.count();
  console.log(`  PushSubscription rows in DB:      ${subCount}`);

  // ─────────────────────────────────────────────────────────────────────────
  head("\n[5] User timezone coverage");
  const tzAll = await prisma.user.groupBy({
    by: ["timezone"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  let totalUsers = 0;
  for (const r of tzAll) totalUsers += r._count._all;
  console.log(`Total active users: ${totalUsers}`);
  for (const r of tzAll.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${(r.timezone ?? "UTC").padEnd(28)} ${r._count._all}`);
  }

  // Default timezone for new users — find in the User model definition
  const defaultMatch = /timezone\s+String\s+@default\("([^"]+)"\)/.exec(schema);
  console.log(`\nschema.prisma User.timezone @default = ${defaultMatch?.[1] ?? "(not set explicitly)"}`);

  // ─────────────────────────────────────────────────────────────────────────
  head("\n[6] CHECK constraints currently on the DB");
  if (process.env.DATABASE_URL) {
    const c = new Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    const rows = await c.query(`
      SELECT conname FROM pg_constraint WHERE contype='c'
        AND (conname ILIKE 'habit_completion_%' OR conname ILIKE 'scheduled_workout_%' OR conname ILIKE 'workout_log_%')
      ORDER BY conname
    `);
    for (const r of rows.rows) console.log(`  ${r.conname}`);
    if (rows.rows.length === 0) console.log("  NONE");
    await c.end();
  } else {
    console.log("  (DATABASE_URL not set, skipping)");
  }

  bar();
  console.log("Audit complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(2); })
  .finally(async () => { await prisma.$disconnect(); });
