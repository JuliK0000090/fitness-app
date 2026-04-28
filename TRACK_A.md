# Track A — Retention upgrade

This document covers the three coupled changes shipped in Track A:
ritual `/today`, calendar temporal integrity, and push notifications.

Sister docs: [`PLANNER.md`](./PLANNER.md), [`PLANNER_HEALTH.md`](./PLANNER_HEALTH.md),
[`CALENDAR_RULES.md`](./CALENDAR_RULES.md).

## Temporal rules — four-layer enforcement

`CALENDAR_RULES.md` is the canonical reference; this section is the
quick map.

| Layer | Implementation |
|---|---|
| **DB** | 5 Postgres `CHECK` constraints in [`scripts/migrate.js`](./scripts/migrate.js): `habit_completion_date_not_future`, `habit_completion_completedat_after_date`, `scheduled_workout_done_only_past_or_today`, `scheduled_workout_completedat_after_date`, `workout_log_no_future_startedat`. Re-installed at every Railway boot. |
| **Server / API** | [`lib/calendar/temporal-rules.ts`](./lib/calendar/temporal-rules.ts) — three pure validators: `validateWorkoutStatusChange`, `validateHabitCompletionWrite`, `validateWorkoutLogCreate`. Wired into every write path (chat tools, server actions, `/api/scheduled-workouts/complete`). All return `{ ok, code, reason }` so failures surface as 400 with `code` instead of 500 from the CHECK. |
| **UI** | [`MonthView.tsx`](./app/(app)/month/MonthView.tsx) day-detail drawer disables future-day checkboxes with the hint *"Comes due on the day — check-marks unlock then."* DONE checkbox is the toggle target for the explicit `uncompleteWorkout` flow. Stale-row errors trigger `router.refresh()` instead of reverting to a phantom row. |
| **Self-check** | [`lib/jobs/integrity.ts`](./lib/jobs/integrity.ts) hourly Inngest sweep across all three models, opening/resolving `IntegrityAlert` rows. |

`User.timezone` is the authoritative "today". `lib/time/user-today.ts`
(`dayState`) is the single source of truth for past/today/future
classification across server, validators, and UI.

## Ritual `/today`

`User.todayMode` (default `RITUAL`) decides which view renders:
[`RitualView.tsx`](./app/(app)/today/RitualView.tsx) (single-NEXT-card
ritual) or [`TodayView.tsx`](./app/(app)/today/TodayView.tsx) (the
older dashboard mode).

**Ritual layout principles:**

- One primary action above the fold (`NEXT` card).
- Editorial typography (`font-serif text-display-2xl`), 24px champagne
  rule, body-lg context line.
- Today's blocks collapsed to title + time, no metric noise.
- Week metrics in a single row of three serif numbers.
- "Talk to Vita" ghosted at the bottom — present but not loud.
- Empty state for full rest day: *"Rest is the workout today."*

**Switching to dashboard mode:** `User.todayMode = "DASHBOARD"`. The
existing TodayView still works; this is a per-user preference, not a
removal.

## Push notifications — architecture

### Models

```prisma
PushSubscription      // one row per device endpoint
NotificationPreference // one row per user, lazily created
NotificationLog       // every send attempt audited (delivered or skipped + reason)
```

### Send service — `lib/notifications/send.ts`

Single `send({ userId, category, title, body, deepLink })` entry point.
In order:

1. Load (or create) `NotificationPreference`. Skip with reason
   `category-disabled` if the per-category toggle is off.
2. Check quiet hours in the user's timezone. Skip with reason
   `quiet-hours` unless `essential: true`.
3. Throttle: if the user has already received ≥2 delivered pushes in
   the last 24h, skip with reason `daily-limit-reached`.
4. Confirm VAPID env vars are set. Skip with `vapid-not-configured`
   otherwise.
5. Send to every `PushSubscription` row. Dead subscriptions (404/410)
   are auto-cleaned. Returns the delivered count.

Every attempt — delivered or skipped — writes one `NotificationLog`
row with `delivered`, `skipReason`, and the deep-link.

### Categories

| Category | Default | Trigger | Cron / event |
|---|---|---|---|
| `preWorkout` | on | 25–35 min before scheduled workout | every 5 min |
| `streakSave` | on | user-local 20:00 if habits incomplete and engaged in last 7 days | hourly |
| `weeklyReview` | on | Sunday user-local 19:00 | hourly |
| `reactiveAdjustment` | on | replanner moved blocks | event `planner/replan-summary` |
| `partnerEncouragement` | on | accountability partner sent a note (Track B) | event |

### Inngest schedulers — `lib/jobs/notifications.ts`

`preWorkoutNudge`, `streakSaveNudge`, `weeklyReviewNudge`,
`reactiveAdjustmentSent`. All registered via `notificationFunctions`
in [`app/api/inngest/route.ts`](./app/api/inngest/route.ts).

The reactive-adjustment fire-point is in
[`lib/coach/replan.ts`](./lib/coach/replan.ts) — after
`replanFromConstraint` writes the `ChatSuggestion`, it also
`inngest.send({ name: "planner/replan-summary", data })` so the
notification fires asynchronously without blocking the replan.

## Setup

### VAPID keys

```bash
npx web-push generate-vapid-keys
```

Add to Railway env (and your local `.env`):

```
VAPID_PUBLIC_KEY=<paste publicKey>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same publicKey — exposed to the client>
VAPID_PRIVATE_KEY=<paste privateKey>
VAPID_SUBJECT=mailto:admin@vita.app
```

The `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is what the browser reads via
`/api/notifications/preferences` GET and uses for
`pushManager.subscribe`.

Without these, `send()` resolves with `{ sent: false, reason:
"vapid-not-configured" }` and the schedulers run but don't deliver —
non-fatal.

### Subscribe flow

User opens `/settings/notifications` → "Push notifications" section
shows an **Enable** button if no subscription exists. Tapping it:

1. Reads `publicVapidKey` from `/api/notifications/preferences`.
2. Calls `Notification.requestPermission()`.
3. `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
4. `POST /api/push/subscribe` saves the endpoint + keys.
5. Returns to the page with toggles for each category and the
   quiet-hours window.

## Adding a new notification category

1. Add the column to `NotificationPreference` in `prisma/schema.prisma`,
   default `true`, and re-push.
2. Extend the `NotificationCategory` union in `lib/notifications/send.ts`.
3. Add a label/desc to `PUSH_ITEMS` in
   [`/settings/notifications`](./app/(app)/settings/notifications/page.tsx).
4. Either:
   - Write an Inngest scheduler in `lib/jobs/notifications.ts` and add
     it to `notificationFunctions`, OR
   - Define an event name and `inngest.send()` it from the relevant
     mutation site.
5. Update `TRACK_A.md` "Categories" table.

## Operations

### Test bundle

```bash
npx tsx scripts/test-track-a.ts        # 15 assertions for Track A
npx tsx scripts/test-temporal.ts       # 17 assertions for the temporal layer
npx tsx scripts/test-planner.ts        # 13 assertions for the planner constraint system
```

### Production audit

```bash
DATABASE_URL=$(railway variables --service Postgres --json | jq -r .DATABASE_PUBLIC_URL) \
  npx tsx scripts/audit-current-state.ts
```

Reports temporal violations, /today composition, enums, push infra,
timezone coverage, and CHECK constraints — all in one read-only pass.

### Visual smoke test

`/dev/calendar-test` (alias `/dev/calendar-verify`) renders 9 scenario
rows covering every state combination. Open in production once
`ENABLE_DEV_PAGES=1` is set on Railway.

### Reading delivery health

```sql
SELECT category, "skipReason", COUNT(*)
FROM "NotificationLog"
WHERE "sentAt" >= NOW() - INTERVAL '24 hours'
GROUP BY category, "skipReason"
ORDER BY category, COUNT(*) DESC;
```

`skipReason IS NULL` rows are deliveries. The most common skip reasons
should be `quiet-hours` (expected) and `category-disabled` (expected
when users opt out). `vapid-not-configured` means VAPID env is missing
on Railway.
