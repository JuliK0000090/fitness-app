#!/usr/bin/env node
/**
 * Startup migration script for Railway.
 * 1. Enables pgvector extension (best-effort — skips if not available)
 * 2. Runs prisma db push to create/sync tables
 */

const { Client } = require("pg");

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set — skipping migration");
    process.exit(0);
  }

  // Step 1: enable pgvector extension (ignore error if not available)
  try {
    const client = new Client({ connectionString: url });
    await client.connect();
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    await client.end();
    console.log("pgvector extension ready");
  } catch (e) {
    console.warn("pgvector not available, continuing without it:", e.message);
  }

  // Step 2: prisma db push
  const { execSync } = require("child_process");
  try {
    execSync(
      `npx prisma db push --accept-data-loss`,
      { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } }
    );
  } catch (e) {
    console.error("prisma db push failed:", e.message);
    process.exit(1);
  }

  // Step 3: planner-health CHECK constraints (Phase 2 of PLANNER_HEALTH.md).
  // These prevent future-dated completion rows from being inserted, regardless
  // of which code path tries. Idempotent — drops first, then re-adds.
  // CURRENT_DATE is server timezone; documented as a small over-strict edge
  // for users near a date boundary in PLANNER_HEALTH.md.
  try {
    const client = new Client({ connectionString: url });
    await client.connect();

    // HabitCompletion: date <= today
    await client.query(`
      ALTER TABLE "HabitCompletion"
        DROP CONSTRAINT IF EXISTS habit_completion_date_not_future
    `);
    await client.query(`
      ALTER TABLE "HabitCompletion"
        ADD CONSTRAINT habit_completion_date_not_future
        CHECK ("date" <= CURRENT_DATE)
    `);

    // ScheduledWorkout: status DONE / MISSED / AUTO_SKIPPED only on past-or-today
    // SKIPPED is also a completion-flavoured status in this schema (it's a user
    // decision recorded after the fact); MOVED is a relocation marker that
    // doesn't imply completion, so it's allowed on future dates.
    await client.query(`
      ALTER TABLE "ScheduledWorkout"
        DROP CONSTRAINT IF EXISTS scheduled_workout_done_only_past_or_today
    `);
    await client.query(`
      ALTER TABLE "ScheduledWorkout"
        ADD CONSTRAINT scheduled_workout_done_only_past_or_today
        CHECK (
          status NOT IN ('DONE', 'SKIPPED', 'MISSED', 'AUTO_SKIPPED')
          OR "scheduledDate" <= CURRENT_DATE
        )
    `);

    // ScheduledWorkout: completedAt cannot precede the scheduledDate. (Both
    // sides are tolerated as null — a row that's never been completed has
    // completedAt=NULL.) Cast completedAt to date to match scheduledDate's
    // @db.Date column and avoid spurious failures from time-of-day jitter.
    await client.query(`
      ALTER TABLE "ScheduledWorkout"
        DROP CONSTRAINT IF EXISTS scheduled_workout_completedAt_after_date
    `);
    await client.query(`
      ALTER TABLE "ScheduledWorkout"
        ADD CONSTRAINT scheduled_workout_completedAt_after_date
        CHECK (
          "completedAt" IS NULL OR "completedAt"::date >= "scheduledDate"
        )
    `);

    // WorkoutLog: startedAt cannot be in the future. A WorkoutLog
    // represents an actually-completed session — by definition it can't
    // claim to have started later than now. CURRENT_TIMESTAMP is server-tz
    // (UTC on Railway); the application code is the one that does
    // user-tz precision, this is the backstop.
    await client.query(`
      ALTER TABLE "WorkoutLog"
        DROP CONSTRAINT IF EXISTS workout_log_no_future_startedAt
    `);
    await client.query(`
      ALTER TABLE "WorkoutLog"
        ADD CONSTRAINT workout_log_no_future_startedAt
        CHECK ("startedAt" <= CURRENT_TIMESTAMP)
    `);

    // HabitCompletion: completedAt cannot precede date.
    await client.query(`
      ALTER TABLE "HabitCompletion"
        DROP CONSTRAINT IF EXISTS habit_completion_completedAt_after_date
    `);
    await client.query(`
      ALTER TABLE "HabitCompletion"
        ADD CONSTRAINT habit_completion_completedAt_after_date
        CHECK (
          "completedAt" IS NULL OR "completedAt"::date >= "date"
        )
    `);

    await client.end();
    console.log("planner-health CHECK constraints installed");
  } catch (e) {
    console.error("planner-health constraints failed:", e.message);
    // Don't exit — the app can still run; the integrity sweep (Phase 5) will
    // surface this in the dashboard.
  }
}

run();
