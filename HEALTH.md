# Vita — Apple Health Integration

## End-to-end data flow

```
iPhone (Health Auto Export app)
    │
    │  POST /api/webhooks/hae/{token}
    │  JSON payload (metrics + workouts)
    ▼
Webhook handler (app/api/webhooks/hae/[token]/route.ts)
    │  validates token → finds HealthIntegration → stores in HaeRaw
    │  fires Inngest event: health/hae.raw.received
    ▼
Inngest: processRawPayload (lib/jobs/health-ingest.ts)
    │  parses metrics → upserts HaeMetric rows (one per metric per date per source)
    │  updates HaeRaw.processed = true
    │  fires: health/hae.rollup.daily for each affected date
    ▼
Inngest: rollupHealthDaily
    │  groups HaeMetric rows by date
    │  applies source priority (AppleWatch > iPhone > ThirdParty > Manual)
    │  upserts HaeDaily row (steps, sleepHours, hrvMs, heartRateResting, readinessScore, workoutCount)
    │  fires: health/hae.autocomplete
    ▼
Inngest: autoCompleteBlocksFromHealth
    │  finds habits with step-count targets
    │  if today's steps >= target → marks habit complete
    ▼
/today page
    reads HaeDaily for today → readinessScore badge + steps progress
    TodaySignals (client) → fetches /api/health/today → shows metric tiles
```

## Models

| Model | Purpose |
|---|---|
| `HealthIntegration` | One per user — stores webhook token, active flag, payload count |
| `HaeRaw` | Raw JSON payload as received — 30-day retention then auto-deleted |
| `HaeMetric` | Individual metric values by date and source (before rollup) |
| `HaeDaily` | Rolled-up daily summary — authoritative for /today and AI tools |
| `HaeWorkout` | Individual workout records (name, duration, calories, heart rate) |

## How to add a new metric type

1. Add the HAE metric name → Vita field mapping in `lib/health/mapping.ts` (`HAE_TO_VITA`)
2. If it needs a new column on `HaeDaily`, add it to the Prisma schema and run `prisma db push`
3. Update the rollup function in `lib/jobs/health-ingest.ts` to include the new field
4. Add it to `KEY_METRICS` in `app/api/health/today/route.ts` if it should appear in TodaySignals
5. Add it to `query_health_metric` enum in `lib/vita-tools.ts`

## Debugging a failing webhook

1. Check `/dev/health-debug` (dev) — shows last 20 raw payloads with processed/error status
2. If a raw payload shows `error`, click "Reprocess" to re-fire the Inngest event
3. Check Inngest dashboard for function run logs
4. Check that `HealthIntegration.active = true` and the token in the webhook URL matches `HealthIntegration.webhookToken`
5. Use "Simulate payload" on the debug page to send a test payload without touching the iPhone

Common issues:
- `HaeRaw.processed = false` with no error → Inngest event may not have fired (check `inngest.send` logs)
- `HaeRaw.error` set → parsing failed, likely a new metric format from HAE — update `HAE_TO_VITA` mapping
- Token mismatch → user disconnected and reconnected; old URL is dead. Update URL in Health Auto Export.

## Timezone handling

HAE sends dates in the user's local timezone (e.g. `"2026-04-24 06:30:00 -0400"`). The ingest pipeline:
1. Parses the offset from the date string → converts to UTC instant
2. Converts UTC instant to the user's stored timezone (`User.timezone`) via `date-fns-tz`
3. Uses the **local** date (not UTC date) as the key for `HaeDaily`

This ensures that an activity at 11:30 PM local time is attributed to that local date, not the next UTC day.

## Source priority

When multiple sources report the same metric for the same day, the rollup keeps the highest-priority source:

1. `APPLE_WATCH` (most accurate for heart rate, HRV, steps)
2. `IPHONE` (fallback for steps, distance when Watch not worn)
3. `THIRD_PARTY` (other apps writing to Health)
4. `MANUAL` (user-entered values)

Source is inferred from the `sourceName` field in the HAE payload. See `lib/health/mapping.ts → inferSource()`.

## Android future path

Android uses [Health Connect](https://developer.android.com/health-and-fitness/guides/health-connect) (Google's unified health data layer). The architecture is the same:
- Android app polls Health Connect → POSTs to the same webhook format
- Or: direct Health Connect webhook integration (available in Health Connect SDK 1.1+)

A waitlist page exists at `/settings/integrations/android`. When ready, add an Android-specific webhook handler and map Health Connect metric names to `HAE_TO_VITA`.

## Privacy and data retention

- **Raw payloads** (`HaeRaw`): auto-deleted after 30 days by the `cleanupOldRawPayloads` Inngest cron
- **Daily summaries** (`HaeDaily`): retained for the life of the account
- **Workouts** (`HaeWorkout`): retained for the life of the account
- **On disconnect**: `HealthIntegration.active` set to false; webhook token rotated (old URL stops working); all historical data preserved
- **On account deletion**: all health data removed within 30 days per privacy policy
- Data never leaves Vita's infrastructure (Railway, US region) and is never shared with third parties
