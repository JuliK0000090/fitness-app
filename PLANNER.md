# Planner architecture

This document covers how Vita schedules and re-plans workouts. It applies to
`ScheduledWorkout` rows only — habits live on a separate track (see
`lib/habits/complete.ts`) and are not affected by this system.

## Why this exists

Three failures motivated the overhaul:

1. **Duplicates and over-scheduling.** The same workout type appeared multiple
   times in a day; three heated classes back to back; intensity stacking with
   no rest gap.
2. **Constraints didn't propagate.** A user mentioning "microneedling
   Saturday — no heat 48h" did nothing for the Sunday plan still on the
   calendar.
3. **Past `PLANNED` blocks rotted.** Yesterday's workout was still marked
   `PLANNED` at 9am the next day, half-checked, half-not.

Patterns: Reclaim.ai (hard rule constraint solver), Motion (continuous
re-plan), and clinical EHR systems (treatment-driven recovery windows).

## Constraint system

Every user-stated rule lives in **`PlannerConstraint`**. Vita extracts these
from chat via `add_planner_constraint`; users can also add or edit them
manually at `/settings/constraints`.

A constraint has:

- **`type`** — one of `TREATMENT`, `INJURY`, `ILLNESS`, `TRAVEL`,
  `SCHEDULE_BLACKOUT`, `ACTIVITY_RESTRICTION`, `PREFERENCE`, `CYCLE_PHASE`,
  `RECOVERY_REQUIREMENT`.
- **`scope`** — `HARD` (never violate), `SOFT` (prefer not), `ADVISORY`
  (informational only).
- **`startDate` / `endDate`** — both `@db.Date`; `endDate` null means
  indefinite.
- **`payload Json`** — type-specific data (see "Payload shapes" below).
- **`reason`** — human-readable one-liner shown in the UI banner.
- **`source`** — provenance: `user_chat` | `manual_settings` | `system_rule`
  | `wearable_inferred`.

### Treatment defaults

Treatment shortcut keys carry their own restriction window so Vita doesn't
have to hand-construct payloads. Single source of truth:
`lib/coach/constraints.ts` → `TREATMENT_DEFAULTS`.

| Key             | Days | Restrictions                              |
|-----------------|------|-------------------------------------------|
| `microneedling` | 2    | heat, sweat, harsh_sun                    |
| `botox`         | 1    | exercise, inversions, facial_massage      |
| `filler`        | 2    | exercise, heat, facial_massage            |
| `laser`         | 1    | heat, harsh_sun                           |
| `chemical_peel` | 7    | heat, sweat, harsh_sun                    |
| `dental`        | 1    | exertion                                  |
| `massage`       | 1    | intense_exercise                          |
| `surgery`       | 7    | exercise, heat, exertion (ask the user)   |

### Payload shapes

```jsonc
// TREATMENT (auto-populated when treatmentKey is used)
{ "treatmentName": "Microneedling", "treatmentKey": "microneedling",
  "restrictions": ["heat", "sweat", "harsh_sun"], "notes": "..." }

// INJURY
{ "bodyPart": "left knee", "severity": "moderate",
  "allowedActivities": ["upper_body", "core", "yoga"] }

// ILLNESS
{ "severity": "mild", "suggestedRestUntil": "2026-05-04" }

// TRAVEL
{ "departureDate": "2026-05-10", "returnDate": "2026-05-17",
  "destination": "Lisbon", "equipmentAvailable": ["bodyweight", "hotel_gym"] }

// SCHEDULE_BLACKOUT
{ "weekdays": [0, 6], "timeRanges": [["09:00", "17:00"]] }

// ACTIVITY_RESTRICTION
{ "restrictedTags": ["heat"], "reason": "summer dry-spell" }
```

## The 8 validation rules

Implemented in `lib/coach/validate.ts`. Hard rules (`severity: "error"`)
trigger regeneration; soft rules (`severity: "warning"`) ship with the plan
but are surfaced.

| #  | Rule                          | Severity | What it catches                                         |
|----|-------------------------------|----------|---------------------------------------------------------|
| R1 | `no-duplicates`               | error    | Same `workoutTypeName` twice on the same day            |
| R2 | `max-workouts-per-day`        | error    | More than 2 workouts on a single day (configurable)     |
| R3 | `max-heated-per-day`          | error    | More than 1 heated class (Hot Pilates, sauna, Bikram…)  |
| R4 | `min-gap-between-intense`     | error    | Two intensity-≥7 sessions less than 4h apart            |
| R5 | `constraint-{id}` (TREATMENT) | error/warn | Workout matches a TREATMENT/ACTIVITY restriction tag  |
| R6 | `injury-{id}`                 | error    | INJURY allowedActivities don't match the workout        |
| R7 | `illness-{id}`                | warning  | ILLNESS active and workout intensity ≥ 6                |
| R8 | `travel-{id}`                 | warning  | TRAVEL window and workout requires unavailable kit      |

### Heat detection

`isHeatedActivity()` matches `/\b(hot|sauna|bikram|infrared|heated)\b/i`.
`isSweatyActivity()` adds `run|hiit|spin|cardio|cycle` for the broader
"no sweat" rule used by some treatments.

### Activity name normalisation

Both the validator and `findBlockingConstraint` lowercase + strip non-
alphanumerics before comparison, so `"upper_body"` (constraint payload)
matches `"Upper Body Strength"` (workout name).

## Validate-then-commit

Every `ScheduledWorkout` creation goes through `safeScheduleWorkout()` in
`lib/coach/schedule.ts`. The flow:

1. Run `validateDayPlan` against the proposed day (existing `PLANNED` rows +
   the trial workout).
2. If hard violations exist on the requested date, walk forward up to **14
   days** looking for a clean slot.
3. If a clean slot is found, commit there and record the `shifted` from/to.
4. If no clean slot exists in 14 days, do **not** create the row. Return
   `finalStatus: "FAILED_USER_NOTIFIED"`.
5. Every attempt logs to `PlanValidationLog` (`PASSED` /
   `PASSED_WITH_WARNINGS` / `FAILED_USER_NOTIFIED`).

Both creation sites use this:
- `lib/vita-tools.ts → schedule_workout` tool
- `app/api/goals/create-plan/route.ts` (the goal-plan generator)

## Re-planning when a constraint is added

Vita's tool flow:

1. User mentions a treatment, injury, etc. in chat.
2. Vita calls **`add_planner_constraint`** — a row lands in
   `PlannerConstraint`.
3. Vita immediately calls **`replan_affected_blocks`** with the new
   constraint id.
4. `replanFromConstraint(constraintId)` walks every `PLANNED`
   `ScheduledWorkout` between the constraint's `startDate` and `endDate`
   (default lookahead 60 days), uses `findBlockingConstraint` against the
   full active-constraint set, and:
   - if blocked, walks forward up to 14 days for a non-conflicting day that
     also passes the per-day validator;
   - moves the row to that day with `status: "MOVED"` and `source:
     "ai_suggested"`;
   - if no slot found, leaves it `MOVED` with the original date so it
     surfaces in the suggestion drawer.
5. A `ChatSuggestion` row is created with `type: "PLAN_REPLANNED"` and a
   `payload` listing every `movedDetails` entry (workoutId, name, fromDate,
   toDate, reason).
6. Vita's reply names what changed: "I moved your Saturday and Sunday hot
   Pilates to Monday and Tuesday because of the microneedling. Reformer is
   fine — no heat there."

The UI banner on `/today` reads the latest `PLAN_REPLANNED` suggestion and
shows it for 24h with a "See changes" drawer and "Undo" button.

## Critique pass

`lib/coach/critique.ts → critiqueWeekPlan()` runs Claude Haiku on a
multi-day committed plan as a **subjective safety net** — catches things the
mechanical rules miss (e.g. "all heated mid-week with no recovery" or
"feels monotonous"). Currently used by:

- `app/api/goals/create-plan/route.ts` — runs after the 4-week plan commits.

Not used on every `schedule_workout` chat tool call (one workout at a time —
mechanical validator is enough, and the LLM round-trip isn't worth the
latency).

Returns `{ ok, issues[] }`. Issues are logged but **don't block** because
the mechanical validator already enforced hard rules; the critique is a
warning lane.

## End-of-day rollover

`lib/jobs/rollover.ts → rolloverScheduledWorkouts` runs on the `0 * * * *`
cron and acts only when the user's local time is `00`. For each user:

1. For every yesterday-dated `PLANNED` `ScheduledWorkout`, check if any
   active constraint blocks it via `findBlockingConstraint`.
2. If blocked → `status: "AUTO_SKIPPED"`, `skippedReason: <constraint.reason>`.
3. If not blocked → `status: "MISSED"`.
4. Sets `User.lastRolloverDate = today` for idempotency.

Habits get rolled over in the same pass via `markMissedHabits()` (already
existed, just wasn't wired to a cron). Habits → `MISSED` if no completion
row for yesterday exists.

## Late-day reality check

Same module, separate function: `lateDayBlockCheck` runs hourly and acts at
user-local 21:00. For every still-`PLANNED` workout today whose scheduled
end-time was >1h ago, it creates a `LATE_DAY_REALITY_CHECK` `ChatSuggestion`
("Reformer at 9am didn't happen. Move to tomorrow, or skip?"). De-duped per
workout per day via the suggestion's `payload.workoutId`.

## How to add a new constraint type

1. Add the enum value to `ConstraintType` in `prisma/schema.prisma`.
2. `npx prisma db push --accept-data-loss && npx prisma generate`.
3. Document the payload shape in this file under "Payload shapes".
4. Update `lib/coach/validate.ts` with a new branch in `validateDayPlan`
   that emits `Violation` rows when the rule is broken.
5. If the rule applies via simple restriction tags, extend `extractRestrictions`
   in `lib/coach/constraints.ts` and `workoutViolatesRestriction` to match
   the tag against workout names.
6. Update `lib/system-prompt.ts` "Patterns to detect" with examples of how
   the user might say the new constraint in chat, so Vita extracts it.
7. Add a test case in `scripts/test-planner.ts`.

## Acceptance test

```bash
npx tsx scripts/test-planner.ts
```

Creates a throwaway user, exercises every key path, asserts:

- Microneedling moves hot classes but keeps reformer
- Validator catches duplicate Hot Pilates same day
- Validator catches >1 heated class same day
- Injury constraint rejects running, allows upper-body strength
- End-of-day rollover resolves yesterday's `PLANNED` to `MISSED` /
  `AUTO_SKIPPED`
- No `PLANNED` rows linger in the past

13 assertions; all must pass.
