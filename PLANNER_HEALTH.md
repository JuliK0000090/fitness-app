# Planner health

This document covers the data invariants, render rules, and self-check
machinery that keep the workout planner trustworthy. Companion to
[`PLANNER.md`](./PLANNER.md), which covers the constraint system itself.

## The three bugs this addresses

1. **Future-dated workouts and habits showed as "Done"** (champagne dots in
   the calendar) when they hadn't happened yet. Was a render-rule bug — the
   inline ternary in [`MonthView`](./app/\(app\)/month/MonthView.tsx) had no
   single source of truth for status → colour, so edge cases produced the
   wrong dot.

2. **Future days had habit completion rings** showing partial completion when
   the day hadn't occurred. Same render-rule bug class — the day-detail
   drawer used `habitPct > 0` with no phase check.

3. **The planner only generated 4 weeks ahead** at goal-creation time and
   never refreshed. After May 17 the calendar emptied out for users with
   active weekly targets.

The first two were render-only — the audit ([Phase 0](#phase-0-audit-script))
found **zero** future-dated DONE rows in production. The third was real
(week 4+ literally had no `ScheduledWorkout` rows).

## Architecture

### Data invariants

Two Postgres CHECK constraints enforce that the database can never reach a
"future-completion" state, regardless of which code path tries:

```sql
ALTER TABLE "HabitCompletion"
  ADD CONSTRAINT habit_completion_date_not_future
  CHECK ("date" <= CURRENT_DATE);

ALTER TABLE "ScheduledWorkout"
  ADD CONSTRAINT scheduled_workout_done_only_past_or_today
  CHECK (
    status NOT IN ('DONE', 'SKIPPED', 'MISSED', 'AUTO_SKIPPED')
    OR "scheduledDate" <= CURRENT_DATE
  );
```

Installed by [`scripts/migrate.js`](./scripts/migrate.js), which runs on
every Railway boot after `prisma db push`. Drop-and-re-add is idempotent.

**Timezone caveat.** `CURRENT_DATE` is the database server's timezone (UTC
on Railway). For users hours away from a date boundary the check is slightly
over-strict — it rejects a "completion for tomorrow" the user could plausibly
intend if their local clock is already past midnight while the server's
isn't. We accept this trade — it errs on the safe side, and the
application code never asks a user to log "tomorrow" anyway.

`safeCompletionWrite()` in [`lib/habits/complete.ts`](./lib/habits/complete.ts)
wraps insert/upsert calls and surfaces a CHECK violation as a clear bug
message naming the call site, then returns `null` so the caller can decide
what to do. No silent crashes.

### Planner horizon

[`lib/coach/regenerate.ts`](./lib/coach/regenerate.ts) →
`regenerateUserPlan(userId)` rebuilds the next **8 weeks** of PLANNED
workouts from the user's active `WeeklyTarget` rows.

**Priority order** (NEVER violated):

1. NEVER touch rows with status `DONE`, `SKIPPED`, `MISSED`, `AUTO_SKIPPED`,
   or `MOVED` — historical truth or explicit user decisions.
2. NEVER touch rows on past-or-today dates.
3. NEVER touch rows where `userEdited = true` — the user manually placed
   them.
4. CAN delete and recreate `PLANNED` rows on future dates that the planner
   itself generated (`source` ∈ `["ai_suggested", "manual"]`,
   `userEdited = false`).
5. After deletion, fill the week's quota using `safeScheduleWorkout`
   ([`lib/coach/schedule.ts`](./lib/coach/schedule.ts)) which respects the
   8-rule validator and active `PlannerConstraint`s.

**Day-priority** for placement: preferred spread days first (e.g. Mon/Wed/Fri
for a 3/wk target), then remaining days as fallback so a quota still hits
when preferred days collide with another target's placements.

**UTC-only horizon math.** `date-fns.startOfWeek` uses local time and
silently drifts the horizon by a week depending on which timezone the server
is in. The regenerator computes Monday-of-week in UTC manually
(`utcMondayOfWeek`) so the schedule lines up with `ScheduledWorkout.scheduledDate`
which is `@db.Date` (UTC).

**Idempotency.** Running regenerate twice in a row produces the same result.
The hourly cron + the constraint replanner + the manual button + the goal-
creation endpoint can all call it without coordination.

#### Re-plan triggers

| Event | Path |
|---|---|
| Goal created | `/api/goals/create-plan` calls `regenerateUserPlan` after creating WeeklyTargets |
| Constraint added | `replanFromConstraint` calls regenerate after moving blocked workouts |
| Daily 02:00 user-local | `regeneratePlanRolling` Inngest job in [`lib/jobs/rollover.ts`](./lib/jobs/rollover.ts) |
| User taps "Regenerate" | `POST /api/planner/regenerate` from `/settings/plan` |

### Rendering rules

[`lib/calendar/render-rules.ts`](./lib/calendar/render-rules.ts) is the
single source of truth for status → visual mapping. Every calendar imports
`dotsForDay` and `ringForDay` — never compute a colour inline.

**`dotsForDay(state)`** — given a `CalendarDayState` returns the list of
dots to render:

| Phase | Status | Source | Dot |
|---|---|---|---|
| past / today | `DONE` | any | `done` (champagne) |
| past / today | `SKIPPED` / `AUTO_SKIPPED` | any | `skipped` (subtle) |
| past / today | `MISSED` | any | `missed` (terracotta/40) |
| past / today | `PLANNED` (today) | `ai_suggested` | `suggests` |
| past / today | `PLANNED` (today) | other | `planned` |
| past / today | `PLANNED` (past) | any | `missed` (rollover should have caught) |
| past / today | `MOVED` | any | (no dot — relocated row gets its own) |
| **future** | `PLANNED` | `ai_suggested` | `suggests` |
| **future** | `PLANNED` | other | `planned` |
| **future** | `MOVED` | any | `planned` |
| **future** | anything else | any | (no dot, console warning) |

**`ringForDay(state)`** — habit-completion ring:

- Future days: `show: false` unconditionally. Always.
- Past/today, no expected habits: `show: false`.
- Past/today, expected habits: `fillRatio = doneCount / totalHabitsForDay`,
  colour = `done` (≥1) / `partial` (0 < r < 1) / `missed` (0).

**Tailwind helpers**: `DOT_CLASS` and `RING_STROKE` mappings. Don't hardcode
class names elsewhere.

### Self-check

`dataIntegritySweep` in [`lib/jobs/integrity.ts`](./lib/jobs/integrity.ts)
runs hourly. It checks:

1. `HabitCompletion` rows with `date > today` → should be 0 (CHECK constraint
   blocks them, but if the constraint is ever dropped this finds them).
2. `ScheduledWorkout` rows with future date AND status in
   `(DONE, SKIPPED, MISSED, AUTO_SKIPPED)` → should be 0.
3. For every user with active `WeeklyTarget`s, every week of the next 8
   weeks should have at least `(sum of targetCount - 1)` `PLANNED` rows.

Issues are logged at error level. Search Railway logs for
`[planner-health]` to find them. If a sweep returns issues:

- Future-dated completion rows → manually inspect with
  `npx tsx scripts/audit-planner-data.ts`, then run
  `npx tsx scripts/cleanup-planner-data.ts` (with `--dry-run` first).
- Per-user shortfalls → trigger a manual regen via the `/settings/plan`
  button or `POST /api/planner/regenerate`. If shortfalls persist, check
  for active blocking constraints in `/settings/constraints`.

## Operations

### Scripts

| Path | Purpose |
|---|---|
| [`scripts/audit-planner-data.ts`](./scripts/audit-planner-data.ts) | Read-only report of impossible rows + per-week horizon counts |
| [`scripts/cleanup-planner-data.ts`](./scripts/cleanup-planner-data.ts) | Atomic cleanup of impossible rows. Supports `--dry-run` |
| [`scripts/test-planner.ts`](./scripts/test-planner.ts) | Acceptance test for the constraint system |

### Connecting to production

Railway exposes a public TCP proxy URL for the Postgres service. From
`railway variables --service Postgres --json` extract `DATABASE_PUBLIC_URL`,
then:

```bash
DATABASE_URL="<DATABASE_PUBLIC_URL>" npx tsx scripts/audit-planner-data.ts
```

### Adding a new completion-flavoured WorkoutStatus

If a new status is added that means "the workout has happened and isn't
re-planned", add it to:

1. `enum WorkoutStatus` in `prisma/schema.prisma`
2. The CHECK constraint's IN list in `scripts/migrate.js`
3. The `dotsForDay` switch in `lib/calendar/render-rules.ts`
4. The integrity sweep's `status: { in: [...] }` in `lib/jobs/integrity.ts`
5. The cleanup script's `COMPLETION_STATUSES` array
