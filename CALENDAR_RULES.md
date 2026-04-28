# Calendar temporal rules

This document is the canonical reference for the calendar's data invariants.
Companion to [`PLANNER.md`](./PLANNER.md) (constraint system) and
[`PLANNER_HEALTH.md`](./PLANNER_HEALTH.md) (planner-horizon hygiene).

## The eight rules

These apply to every model that the calendar reads —
`ScheduledWorkout`, `WorkoutLog`, `HabitCompletion`.

| # | Rule | Applies to |
|---|---|---|
| R1 | Past dates may NOT have status `PLANNED`. The end-of-day rollover converts past `PLANNED` → `MISSED`. | ScheduledWorkout |
| R2 | Today: any status valid. The only window where status-change actions are unconditionally appropriate. | All |
| R3 | Future dates may only hold `PLANNED` or `MOVED`. Never `DONE` / `SKIPPED` / `MISSED` / `AUTO_SKIPPED`. | ScheduledWorkout |
| R4 | `completedAt` must be ≥ the workout's date and ≤ now. | ScheduledWorkout, HabitCompletion |
| R5 | Direct `DONE` → `PLANNED` downgrades are rejected. The explicit `uncompleteWorkout` flow is the only path that can revert (it also refunds XP and deletes the WorkoutLog atomically). | ScheduledWorkout |
| R6 | "Today" is always the user's local timezone (`User.timezone`), never server UTC. | All |
| R7 | UI checkbox inputs are disabled on future days. | MonthView day-detail drawer |
| R8 | `HabitCompletion.date` must be ≤ user-local-today. | HabitCompletion |

A `WorkoutLog` row is, by definition, a record of something that already
happened. Its `startedAt` therefore must be ≤ now in the user's timezone
(no separate rule number — it's R3 applied to the model whose existence
implies completion).

## Four-layer enforcement

A bug at any one layer is caught by the next. The layers, from outermost
to innermost:

### 1. UI layer — `app/(app)/month/MonthView.tsx`

- The day-detail drawer disables check-mark buttons on future days, with
  a tooltip "Only check this on the day you actually do it".
- A future-day drawer shows the hint "Planned for [date]. Comes due on
  the day — check-marks unlock then." above the workout list.
- A `DONE` checkbox is the toggle target for `uncompleteWorkout` (R5),
  with tooltip "Tap to undo".
- On a stale-row error from the server (the row was deleted between the
  page render and the click), the client calls `router.refresh()`
  instead of reverting optimistic state to a phantom row.

### 2. Server-tool / API layer — `lib/calendar/temporal-rules.ts`

Single source of truth: three pure validators, each returning
`{ ok: true } | { ok: false, code, reason }`:

```ts
validateWorkoutStatusChange({ scheduledDate, userTimezone, currentStatus, newStatus })
validateHabitCompletionWrite({ date, userTimezone, status })
validateWorkoutLogCreate({ startedAt, userTimezone })
```

Wired into:

| Path | Tool / endpoint |
|---|---|
| Vita chat tool | [`complete_workout`](./lib/vita-tools.ts), [`skip_workout`](./lib/vita-tools.ts), [`log_workout`](./lib/vita-tools.ts), [`import_workouts_from_screenshot`](./lib/vita-tools.ts) |
| Server action | [`completeWorkout`](./app/actions/habits.ts), [`uncompleteWorkout`](./app/actions/habits.ts) |
| HTTP endpoint | [`/api/scheduled-workouts/complete`](./app/api/scheduled-workouts/complete/route.ts) (returns 400 with `code` + `reason`, never lets the CHECK constraint surface as a 500) |

Every rejection includes a stable `code` like `FUTURE_STATUS_NOT_ALLOWED`,
`FUTURE_WORKOUT_LOG_NOT_ALLOWED`, `PAST_PLANNED_NOT_ALLOWED`,
`USE_UNCOMPLETE_FLOW`.

### 3. Database layer — Postgres `CHECK` constraints

Five constraints installed at boot via [`scripts/migrate.js`](./scripts/migrate.js).
Idempotent — drops then re-adds on every Railway boot.

| Constraint | Enforces |
|---|---|
| `habit_completion_date_not_future` | `HabitCompletion.date <= CURRENT_DATE` |
| `habit_completion_completedAt_after_date` | `completedAt IS NULL OR completedAt::date >= date` |
| `scheduled_workout_done_only_past_or_today` | `status NOT IN (DONE/SKIPPED/MISSED/AUTO_SKIPPED) OR scheduledDate <= CURRENT_DATE` |
| `scheduled_workout_completedAt_after_date` | `completedAt IS NULL OR completedAt::date >= scheduledDate` |
| `workout_log_no_future_startedAt` | `startedAt <= CURRENT_TIMESTAMP` |

`CURRENT_DATE` / `CURRENT_TIMESTAMP` are server-tz (UTC on Railway). The
application code does the user-tz precision check earlier; these are the
unconditional backstop. The result is a slight over-strictness for users
within hours of a date boundary — accepted in exchange for an absolute
guarantee that bad data can never exist.

### 4. Self-check — `lib/jobs/integrity.ts`

The `dataIntegritySweep` Inngest job runs hourly. It counts violations
across all three models, opens an `IntegrityAlert` row when a class of
violation appears, and resolves the alert (`resolvedAt`) when the next
sweep finds the count back at zero.

Searchable Railway log line: `[planner-health] integrity sweep found
issues:`

`IntegrityAlert` model:

```prisma
model IntegrityAlert {
  id         String    @id @default(cuid())
  detectedAt DateTime  @default(now())
  table      String   // "ScheduledWorkout" | "WorkoutLog" | "HabitCompletion"
  rule       String   // e.g. "scheduled-workout-future-completion"
  count      Int
  sample     Json     // up to 5 row IDs + key fields
  resolvedAt DateTime?
}
```

Rule names emitted by the sweep:

- `scheduled-workout-future-completion` (R3)
- `scheduled-workout-past-planned` (R1 — rollover hasn't run)
- `scheduled-workout-completedAt-future` (R4)
- `workout-log-future-startedAt`
- `habit-completion-future-date` (R8)

## Operations

### Auditing a database

```bash
DATABASE_URL=<...> npx tsx scripts/audit-temporal-integrity.ts
```

Read-only. Counts violations, samples 10 of each, lists installed
CHECK constraints. Run before any cleanup attempt to capture the state.

### Cleaning a database

```bash
DATABASE_URL=<...> npx tsx scripts/cleanup-temporal.ts --dry-run
DATABASE_URL=<...> npx tsx scripts/cleanup-temporal.ts
```

Atomic transaction. Six classes of fix — see the file's docstring for
the exact rules. Always dry-run first.

### Connecting to production

```bash
DATABASE_URL=$(railway variables --service Postgres --json | jq -r .DATABASE_PUBLIC_URL) \
  npx tsx scripts/audit-temporal-integrity.ts
```

### Running the acceptance test

```bash
npx tsx scripts/test-temporal.ts
```

17 assertions covering the validators, every CHECK constraint, and a
round-trip server-action call.

### Reading IntegrityAlert rows

```sql
SELECT detectedAt, "table", rule, count
FROM "IntegrityAlert"
WHERE "resolvedAt" IS NULL
ORDER BY detectedAt DESC;
```

Each unresolved alert means "as of the last hour, this class of
violation has been seen at this count." If a row stays unresolved
across multiple sweeps, the situation hasn't recovered — investigate.

## Adding a new rule

1. Add the validator branch to `lib/calendar/temporal-rules.ts`.
2. If it's a hard data invariant, add a Postgres `CHECK` constraint to
   `scripts/migrate.js` (idempotent: DROP IF EXISTS, then ADD).
3. Run the migration locally and on prod via `node scripts/migrate.js`.
4. Add a probe to `lib/jobs/integrity.ts → checkAllRules` so the hourly
   sweep watches for it.
5. Add a test case in `scripts/test-temporal.ts`.
6. If user-facing behaviour changes, update the system prompt in
   `lib/system-prompt.ts` "Temporal rules" section.
