# Vita launch checklist

Run before flipping any switch that brings real users in.

## Smoke tests

- [x] `npx tsx scripts/test-planner.ts` — 13/13 (constraint system)
- [x] `npx tsx scripts/test-temporal.ts` — 17/17 (temporal four-layer enforcement)
- [x] `npx tsx scripts/test-track-a.ts` — 15/15 (push, render rules, checkbox round-trip)
- [x] `npx tsx scripts/test-onboarding.ts` — 12/12 (atomic commit, 8-week horizon)
- [x] `npx tsx scripts/test-partner.ts` — 11/11 (lifecycle, privacy contract)
- [x] `npx tsx scripts/test-end-to-end.ts` — 16/16 (full new-user round-trip)

**Latest local run: 84/84 across the entire project.**

## Production data hygiene

- [x] `npx tsx scripts/audit-temporal-integrity.ts` against prod returns
      `Total ScheduledWorkout violations: 0`,
      `Total WorkoutLog violations: 0`,
      `Total HabitCompletion violations: 0`
- [x] DB CHECK constraints in place: `habit_completion_date_not_future`,
      `habit_completion_completedat_after_date`,
      `scheduled_workout_done_only_past_or_today`,
      `scheduled_workout_completedat_after_date`,
      `workout_log_no_future_startedat`
- [x] Hourly `dataIntegritySweep` Inngest job firing — check `IntegrityAlert`
      for any unresolved rows (`SELECT * FROM "IntegrityAlert" WHERE "resolvedAt" IS NULL ORDER BY "detectedAt" DESC`)

## Calendar visual

- [ ] `/dev/calendar-test` (or `/dev/calendar-verify`) renders all 9
      scenario rows correctly. Future-day rows show no champagne dots,
      no rings, future-DONE/future-AUTO_SKIPPED rows show no dots
      (data-bug warning logged).
- [ ] `/month` future days show disabled checkboxes with the caption
      *"Comes due on the day — check-marks unlock then."*
- [ ] Tapping a past-day workout's checkbox marks it DONE; tapping
      again unchecks (server action `uncompleteWorkout` revokes the
      WorkoutLog + refunds XP atomically).

## Today ritual

- [ ] `/today` defaults to RITUAL mode for new users (`User.todayMode`
      = `"RITUAL"` is set by the onboarding commit).
- [ ] Layout: greeting + champagne rule + intro line + ONE NEXT card +
      collapsed timeline strip + three week-metric numbers + ghosted
      "Talk to Vita" input.
- [ ] Loads in under 1.5s on mobile 4G.

## Onboarding

- [ ] `/welcome` accessible via `/auth/register` or `/api/auth/verify-email`.
- [ ] Already-onboarded users hitting `/welcome` get redirected to `/today`.
- [ ] Voice → text fallback works on browsers without `SpeechRecognition`.
- [ ] Goal-decomposition: input *"feel strong for sister's wedding July 14"*
      produces a draft with `event_prep` category, deadline within a few
      days of July 14, 4–7 habits, workouts respecting any stated frequency.
- [ ] **No emoji** anywhere in the produced draft (grep returns clean).
- [ ] **No "Victoria's Secret body"** phrasing anywhere (grep returns clean).
- [ ] Lock-in commits atomically; `/today` is populated on the next render.
- [ ] Full flow under 2 minutes from first speak/type to seeing the calendar.

## Push notifications

- [ ] VAPID env vars set on Railway: `VAPID_PUBLIC_KEY`,
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
      `VAPID_SUBJECT`.
- [ ] `/settings/notifications` "Enable push notifications" button
      registers a `PushSubscription` row.
- [ ] Per-category toggles + quiet hours persist via
      `/api/notifications/preferences`.
- [ ] Pre-workout push fires 25–35 minutes before scheduled
      (`preWorkoutNudge` cron, every 5 min).
- [ ] Streak save push fires at user-local 20:00 if habits incomplete
      and engaged in last 7 days.
- [ ] Sunday weekly review push fires at user-local 19:00.
- [ ] Reactive-adjustment push fires when the replanner moves a block
      (event `planner/replan-summary`).

## Accountability partner

- [ ] `/settings/partner` lifecycle: empty → invite → PENDING → ACCEPTED → ENDED.
- [ ] Partner invite email arrives at the partner's address with a
      valid `/partner/accept/[token]` link.
- [ ] Accept page works for both signed-in (auto-link `partnerUserId`) and
      logged-out partners.
- [ ] Sunday user-local 10:00: weekly summary email arrives at the
      partner's address. Subject: `{firstName}'s week.`
- [ ] Encouragement page at `/partner/encourage/[partnerId]/[token]`
      accepts a 280-char note, refuses a second within the same ISO
      week (DB unique constraint).
- [ ] Encouragement push notification arrives in the user's device
      with category `partnerEncouragement`.
- [ ] `/today` shows the italic-serif partner-note card; "Got it"
      marks read and hides it.
- [ ] **Privacy verification**: open the partner's weekly email and
      confirm it contains ONLY first name, workouts done/planned,
      habit %, streak count, and the optional notable line. Never:
      weight, body fat, measurements, goal text, photos, workout
      names beyond category.

## Vita conversational layer

- [ ] System prompt mentions the partner by first name when one is
      ACCEPTED. Chat with Vita, ask "do I have a partner?" — she
      should know.
- [ ] Vita refuses requests like "tell {partner} I'm struggling" —
      that's not a channel she has.
- [ ] Vita refuses to mark a future workout DONE
      (`FUTURE_STATUS_NOT_ALLOWED`).
- [ ] No emoji anywhere in chat outputs (Lucide icons only in tool
      result cards).

## Apple Health integration

- [ ] Apple Health webhook URL set on the Health Auto Export iOS
      shortcut.
- [ ] Sample webhook payload received → `HaeRaw` → `HealthDaily` row
      written.
- [ ] Step block on `/today` shows live count.

## Repo hygiene

- [ ] `grep -rn "Victoria.*Secret" app/ lib/ components/ emails/` returns
      clean (only references in this checklist or migration history).
- [ ] `grep -rn "[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]" app/ lib/ components/ emails/` (or just visually scan) — no emoji in UI prose.

## After launch — first week

1. Watch the Inngest dashboard daily for failed runs of:
   `data-integrity-sweep`, `partner-weekly-summary`, `notif-pre-workout`,
   `notif-streak-save`, `notif-weekly-review`, `regenerate-plan-rolling`.
2. Query the `IntegrityAlert` table — any unresolved row means data
   has drifted; investigate.
3. Personally onboard 5 users this week via `/welcome`. Watch them.
   Note where they hesitate.
4. Watch `NotificationLog` for delivery health:
   ```sql
   SELECT category, "skipReason", COUNT(*)
   FROM "NotificationLog"
   WHERE "sentAt" >= NOW() - INTERVAL '24 hours'
   GROUP BY category, "skipReason"
   ORDER BY category, COUNT(*) DESC;
   ```
   Healthy mix: lots of `delivered=true` (NULL skipReason), some
   `quiet-hours`, some `category-disabled`. Any `vapid-not-configured`
   means the env var dropped.
