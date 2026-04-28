# Track B — Onboarding + accountability partner

This document covers the two coupled changes shipped in Track B:
the 60-second voice onboarding flow at `/welcome` and the
accountability-partner v1 system.

Sister docs: [`TRACK_A.md`](./TRACK_A.md), [`PLANNER.md`](./PLANNER.md),
[`PLANNER_HEALTH.md`](./PLANNER_HEALTH.md), [`CALENDAR_RULES.md`](./CALENDAR_RULES.md).

## Onboarding — `/welcome`

Single-screen progressive flow. Five steps, local React state, no
multi-page wizard chrome. Replaces the previous `/onboarding` route
(left intact as a back-out for now; redirect points wired in
`app/(app)/layout.tsx`, `app/auth/register/page.tsx`,
`app/api/auth/verify-email/route.ts`).

### The five steps

| Step | What it captures | Surfaces written |
|---|---|---|
| 1. Name + timezone | `User.name`, `User.timezone` (auto-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`, inline-editable) | nothing yet |
| 2. Goal capture (voice or text) | natural-language goal description | nothing yet — POSTs to `/api/onboarding/parse-goal` for the draft |
| 3. Confirm GoalDraft | every field editable; `Adjust more` reopens step 2 | atomic commit on `Lock in` |
| 4. Wearable invite | route to `/settings/integrations/apple-health` or skip | nothing |
| 5. Partner invite (optional) | one partner; routes to `/api/onboarding/partner-invite` | `AccountabilityPartner` row PENDING + Resend invite email |

### Voice — Web Speech with bulletproof fallback

Voice handler in [`app/welcome/page.tsx`](./app/welcome/page.tsx)
`Step2`:

- `SpeechRecognition` with `continuous: true`, `interimResults: true`,
  auto-restart on silence (mirrors the Track A chat dictation logic)
- Live transcript shown under the orb so the user sees they're heard
- Falls back **silently** to text input on any failure: no permission,
  no result, browser unsupported, mic permission denied
- Three example chips below the textarea always visible — one tap
  fills + submits

Text input is always present below the mic. The user never gets
blocked.

### Goal-decomposition prompt

[`/api/onboarding/parse-goal`](./app/api/onboarding/parse-goal/route.ts):

1. Pre-matches against the existing `matchPreset()` library
   (`lib/plans/presets.ts`). When a preset matches, its defaults are
   threaded into the Claude prompt as the starting point.
2. Calls Claude Haiku with strict JSON-only instructions, plus
   in-prompt rules for:
   - "summer" = June 21 of current/next year depending on today
   - "this year" = December 31 of the current year
   - "in 8 weeks" = today + 56 days
   - Habits clamped to 4–7 (under-shoots back-filled)
   - Workout frequencies respected as stated, never inflated
   - Never include emoji, never say "Victoria's Secret body"
3. **Defence-in-depth post-processor** sanitises the JSON even if
   Claude ignores instructions: strips emoji, replaces "Victoria's
   Secret body" → "lean and strong", validates category enum,
   validates ISO date format, clamps habit count and durations,
   clamps `timesPerWeek` to 1..7.

The post-processor is the single source of truth — the prompt
explains the rules, but the contract is the type system + the runtime
sanitiser.

### Atomic commit

[`/api/onboarding/commit`](./app/api/onboarding/commit/route.ts) wraps
every write in one Prisma transaction:

- `User.name`, `User.timezone`, `onboardingComplete=true`,
  `todayMode="RITUAL"`
- `Goal` row
- `Habit` rows (one per draft habit)
- `WorkoutType` upserts + `WeeklyTarget` rows

Then runs `regenerateUserPlan(userId)` outside the transaction (the
regenerator does its own writes inside `safeScheduleWorkout`, which
composes poorly with an interactive transaction). If the regenerator
fails post-commit, the daily 02:00 user-local cron picks up — the
request still returns ok and the user lands on `/today`.

## Accountability partner — v1

The simplest possible network effect. **One partner per user. Privacy
by default.** No feed, no leaderboard, no friend graph, no public
anything.

### Schema

```prisma
enum PartnerStatus  { PENDING ACCEPTED DECLINED ENDED }
enum ShareLevel     { MINIMAL STANDARD }   // never includes weight/measurements/photos/goal text

model AccountabilityPartner {
  id            String        @id @default(cuid())
  userId        String        // the user being supported
  partnerEmail  String
  partnerName   String
  partnerUserId String?       // populated if partner has a Vita account
  status        PartnerStatus @default(PENDING)
  invitedAt     DateTime      @default(now())
  acceptedAt    DateTime?
  endedAt       DateTime?
  inviteToken   String        @unique  // 32 url-safe bytes; 7-day expiry
  shareLevel    ShareLevel    @default(STANDARD)
  encouragements PartnerEncouragement[]
}

model PartnerEncouragement {
  id          String                @id @default(cuid())
  partnerId   String
  message     String                @db.Text  // 280 chars max
  sentAt      DateTime              @default(now())
  weekOfYear  Int
  yearNumber  Int
  readAt      DateTime?

  @@unique([partnerId, weekOfYear, yearNumber])  // one note per ISO week
}
```

### Privacy contract — `lib/partner/share.ts`

The `PartnerWeekSummary` TypeScript type is the privacy contract.
**It contains only:**

```ts
{
  userFirstName: string,    // first whitespace-token of User.name only
  workoutsDone: number,
  workoutsPlanned: number,
  habitAdherencePct: number, // 0..100 integer
  streakDays: number,
  streakAlive: boolean,
  notable: string | null,
  weekOfYear: number,
  yearNumber: number,
}
```

By construction the email templates and encouragement page can never
reference: weight, body fat, measurements, goal text, workout names
beyond category, photos, chat history, last name, or email.

### Invite → accept flow

| Endpoint | Role |
|---|---|
| `POST /api/partner/invite` | Caller (signed-in user). Creates PENDING row + Resend invite email |
| `POST /api/onboarding/partner-invite` | Same logic from `/welcome` step 5; kept separate for funnel telemetry |
| `GET /partner/accept/[token]` | Public page, partner clicks email link |
| `POST /api/partner/accept/[token]` | Form action from accept page; flips status to ACCEPTED, links partnerUserId if email matches a Vita user |
| `POST /api/partner/decline/[token]` | Decline form action |
| `POST /api/partner/end` | Caller (signed-in user). Flips status to ENDED |

Token expiry: 7 days from `invitedAt`. Expired invites auto-flip to
ENDED on next access.

### Weekly summary — `lib/jobs/partner.ts`

`partnerWeeklySummary` Inngest function, hourly cron. Fires per-user
when their local time is **Sunday 10:00**. For every ACCEPTED
partnership:

1. Skip if the user had zero activity AND zero engagement this week
   (we don't email a week of nothing — partners shouldn't get a
   weekly "she did nothing" beat).
2. Skip if a `partner-weekly-summary` Email row already exists today
   (de-dupe across same user-local-day).
3. Build `PartnerWeekSummary`. Send via Resend with the
   `WeeklySummary` template + an encourage URL.

### Encouragement (partner → user)

| Surface | Behaviour |
|---|---|
| `/partner/encourage/[partnerId]/[token]` | Public page; 280-char textarea; refuses if a row already exists for this `(partnerId, weekOfYear, yearNumber)` |
| `POST /api/partner/encourage/[partnerId]/[token]` | Saves `PartnerEncouragement`, fires push to user via the Track A `send()` service with category `partnerEncouragement`, redirects to `/sent` |
| `/today` `PartnerNoteCard` | Italic serif card pinned above the planner banner when there's an unread encouragement. "Got it" calls `/api/partner/encouragement/[id]/read` to set `readAt` |

The push category is in `NotificationPreference` (default true), so
the user can disable it without touching the partner relationship.

### Vita's awareness

System prompt ([`lib/system-prompt.ts`](./lib/system-prompt.ts))
gains an "Accountability partner" section when the user has an
ACCEPTED partner:

- Vita knows the partner's first name
- May suggest sending a note when the user mentions struggling, max
  once per session
- **Never** reveals what the partner has seen in their weekly
  summaries
- **Never** quotes a partner note back unless the user brings it up
- **Never** offers to send a message to the partner — the
  encouragement direction is partner→user only

Wired in [`app/api/chat/route.ts`](./app/api/chat/route.ts):
`partnerName` is fetched from the active `AccountabilityPartner`
(first name only) and passed to `buildSystemPrompt`.

## Tests

| Suite | Count | What it covers |
|---|---|---|
| `scripts/test-onboarding.ts` | 12 | Preset match, atomic commit, Goal/Habit/WeeklyTarget rows, 4-week + 8-week horizon, zero future-DONE |
| `scripts/test-partner.ts` | 11 | Invite/accept/end lifecycle, privacy contract on `buildWeekSummary`, DB unique-per-week constraint, partner-of-user query |
| `scripts/test-end-to-end.ts` | 16 | Full lifecycle: onboarding commit + regenerator + /today + /month queries + invite + accept + summary build + encouragement send + push log + end partnership |

Run all five test suites:

```bash
npx tsx scripts/test-planner.ts        # 13/13 — constraint + planner system
npx tsx scripts/test-temporal.ts       # 17/17 — temporal-rule four-layer enforcement
npx tsx scripts/test-track-a.ts        # 15/15 — push send + render rules + check round-trip
npx tsx scripts/test-onboarding.ts     # 12/12 — atomic commit + horizon
npx tsx scripts/test-partner.ts        # 11/11 — partner lifecycle + privacy
npx tsx scripts/test-end-to-end.ts     # 16/16 — full new-user lifecycle
```

**Total: 84/84 across the project.**

## Adding a new privacy field to the partner summary

If a new safe metric is added (e.g. average sleep hours):

1. Add the field to `PartnerWeekSummary` in `lib/partner/share.ts`.
2. Add the computation to `buildWeekSummary()`.
3. Add the field to `PartnerWeeklySummary.tsx` (`emails/partner/`)
   prop type and template body.
4. Add the field to `safeKeys` in
   `scripts/test-partner.ts` and `scripts/test-end-to-end.ts`. The
   tests assert no extra keys leak.
5. Update this doc's "Privacy contract" section.

If a request comes in for a metric that's privacy-sensitive (weight,
body fat, measurements, photos, goal text, chat content):
**refuse**. The contract is intentional and protects the user even
from their own future regret.
