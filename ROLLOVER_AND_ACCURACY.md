# Rollover and accuracy

Two related invariants the dashboard depends on:

1. **Rollover is fresh.** Every user has a `lastRolloverDate` in their
   timezone. When the dashboard reads `/today`, the previous day's
   completions must already have been frozen as DONE / MISSED rows
   dated `userYesterday`. Today's habits must show the user-local
   today only.
2. **Steps match Apple Health.** The number on the steps tile must
   equal the daily total reported by Apple Health, within the lag
   between HAE's last sync and now.

## The user-local "today" is the truth

All habit and health-daily date math runs through the user's IANA
timezone, never the server's UTC clock. The single source of truth is
`lib/time/today.ts`:

- `userTodayStr(tz)` → `"YYYY-MM-DD"` of *today* in the user's tz
- `userToday(tz)` → UTC midnight of that date string (suitable for
  `@db.Date` queries)
- `userYesterday(tz)` → same, one day earlier
- `userLocalHour(tz)` → 0–23 in the user's clock, used by hourly
  Inngest jobs to detect the local-midnight or local-evening window

Why this matters: a user in Toronto taps a habit at 22:00 on April 29.
Server UTC is already 02:00 April 30. If the completion's `date` were
written from `new Date()`, it would land on April 30 — and on April 30
morning the dashboard would show that completion as "done today". The
strikethrough leaks back a day.

## The two write paths

### Server actions (correct)

`app/actions/habits.ts → completeHabit` always loads the user's
timezone first and computes `userTodayStr(tz)` for the completion date.
This is the path the dashboard tap uses.

### Vita tools / chat (was wrong; now fixed)

`lib/vita-tools.ts` previously had a tiny helper `todayStr()` that
returned `new Date().toISOString().split("T")[0]` — server UTC. Every
tool that wrote a HabitCompletion (`add_habit.markDoneToday`,
`complete_habit`, `uncomplete_habit`, `list_habits`, `get_today_plan`)
went through this and inherited the bug.

The fix added `userTodayDate()` and `userTodayString()` helpers inside
`vitaTools(userId)`, both backed by a memoized `tz()` lookup. The
old `todayStr()` is kept for the few places that genuinely want server
UTC (chat thread timestamps, etc.) but is documented as such.

A backstop temporal validation in `complete_habit` rejects future
dates explicitly, matching the `habit_completion_date_not_future`
Postgres CHECK constraint installed by `scripts/migrate.js`.

## Daily rollover

`lib/jobs/rollover.ts → rolloverScheduledWorkouts` runs hourly. For
each user whose `userLocalHour(tz) === 0` and whose `lastRolloverDate`
is not today's date:

1. Yesterday's PLANNED workouts → `MISSED` (or `AUTO_SKIPPED` when a
   `PlannerConstraint` blocked them, with the reason captured).
2. Yesterday's habits with no completion → `MISSED` rows via
   `markMissedHabits(userId, yesterday)`.
3. `user.lastRolloverDate = todayUTCMidnight`.

Idempotency comes from `lastRolloverDate` — if it already matches
today the function exits without writing.

For one-off recovery (e.g. after a bug fix lands), hit
`/api/admin/force-fix-today` while signed in as an admin. It re-rolls
today's HaeDaily and fires `markMissedHabits` + sets
`lastRolloverDate`.

## Step rollup aggregation rules

Apple Health (via Health Auto Export) sends step samples as bucketed
counts: one HaeMetric row per ~5–15 min window with that bucket's
count. Daily total = **sum** across the window. The previous code
took `max`, which gave the largest single bucket (~81 vs the real
1,436).

Aggregations now applied in `lib/health/process-hae.ts → rollupDailyForDate`:

| Metric | Aggregation | Why |
| --- | --- | --- |
| `steps` | sum | bucketed counts |
| `exercise_minutes` | sum | bucketed minutes |
| `distance_km` | sum | bucketed distance |
| `active_energy_kj` | sum | bucketed energy |
| `resting_energy_kj` | sum | bucketed energy |
| `flights_climbed` | sum | bucketed counts |
| `stand_hours` | max | running daily total from Apple |
| `sleep_hours` | max | one nightly total per source |
| `heart_rate_resting` | avg | multiple readings per day |
| `heart_rate_avg` | avg | multiple readings per day |
| `hrv_ms` | avg | multiple readings per day |

The HaeMetric unique key is
`(userId, date, metricType, source, recordedAt)`. Overlapping HAE
payloads (HAE typically sends a 25-hour rolling window each push)
upsert by recordedAt and don't double-count.

Source priority for the winning value: `apple_health` > `garmin` >
`oura` > `whoop` > `fitbit` > `manual`. Within the winning source we
sum / avg / max as above. Resolved by `pickBySourcePriority` in
`lib/health/mapping.ts`.

## The integrity check endpoint

`GET /api/dev/integrity-check` returns a JSON document with three
verdicts:

- `verdict.habitsCorrect` — `lastRolloverDate === userToday`
- `verdict.stepsCorrect` — `|haeDaily.steps − reconstructed| ≤ 5`
- `verdict.pipelineHealthy` — fewer than 3 unprocessed HaeRaw rows
- `verdict.allGood` — all three

If anything is false, the JSON includes the inputs that made it false
(per-source step sums, sources present, last payload time, last
rollover date) so the diagnosis is local to the response.

`GET /api/admin/diagnose-integrity` is the deeper read-only audit; it
includes the three reconstruction candidates (sum / max / sum-across-
sources) for proving exactly which aggregation the stored value
matches.

## The watchdog

`lib/jobs/integrity-watchdog.ts → integrityWatchdog` runs every 15
min:

1. Re-process any HaeRaw rows stuck with `processed=false` for >5 min.
   The webhook now processes inline, so this is a backstop for the
   case where the webhook handler crashed mid-run.
2. Re-roll today's HaeDaily for every active integration so
   late-evening step accumulation is visible on the tile before the
   23:55 wearable resolution job decides DONE/MISSED.

Both steps are idempotent (upserts) and safe to re-run.

## Files to know

```
lib/time/today.ts                              user-tz date helpers (single source of truth)
lib/vita-tools.ts                              userTodayDate / userTodayString memoized per call
app/actions/habits.ts                          dashboard tap path (already correct)
lib/habits/complete.ts                         completeHabit / markMissedHabits
lib/jobs/rollover.ts                           daily rollover (existing, registered)
lib/jobs/integrity-watchdog.ts                 15-min reprocessor + reroll
lib/health/process-hae.ts                      rollupDailyForDate (sum-style aggregations)
app/api/dev/integrity-check/route.ts           green/red verdict
app/api/admin/diagnose-integrity/route.ts      deep read-only audit
app/api/admin/force-fix-today/route.ts         one-shot recovery
prisma/schema.prisma                           User.lastRolloverDate (existing)
scripts/migrate.js                             habit_completion_date_not_future CHECK
```
