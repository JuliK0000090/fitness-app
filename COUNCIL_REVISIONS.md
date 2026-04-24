# Council-Driven Revisions

Implemented following the LLM council's strategic review of Vita.
Completed April 2026.

---

## What changed and why

### Phase 1 — Copy hygiene

**Changed:** Removed all body-ideology language from defaults.

- `victorias_secret` preset renamed `lean_strong`, title changed to "Lean and strong"
- Onboarding example copy changed from "Victoria's Secret body" to "feel strong for my sister's wedding"
- Match phrases no longer include "victoria's secret" or similar
- New presets added: `glp1_muscle_defense`, `wedding_countdown`, `dancer_body`, `strength_foundation`, `marathon_ready`

**Why:** The council flagged that using VS-body language as the hero example is a contradiction when the product claims to be non-triggering. Users type what they want; we don't put words in their mouth.

---

### Phase 2 — GLP-1 muscle-defense mode

**Changed:** First-class GLP-1 mode built as a mode, not a flag.

- `GLP1Profile` model: medication, protein target, resistance target, start date, notes
- `NutritionLog` model: daily protein tracking
- Onboarding step 4 (of 8): explicit opt-in only — "Are you on a GLP-1 medication?" Three answers: Yes / No / Prefer not to say. Never inferred.
- `/settings/health/glp1` settings page: toggle, medication selector, protein target (auto-computed at bodyweight × 1.6), resistance target, notes, medical disclaimer
- GLP1Widget component for /today
- System prompt injection when active: coaching priorities (muscle → protein → resistance), side effects awareness, prescriber deference

**Why:** The council identified this as the single most defensible, timely, and word-of-mouth-ready feature. 40M+ Americans on GLP-1 with no fitness app built for their needs. First mover advantage. Time-sensitive.

**Files:**
- `prisma/schema.prisma` — GLP1Profile, NutritionLog models
- `app/onboarding/page.tsx` — Step 4 GLP-1 opt-in
- `app/api/settings/glp1/route.ts` — GET/PUT/PATCH
- `app/(app)/settings/health/glp1/page.tsx` — Settings UI
- `components/health/GLP1Widget.tsx` — Dashboard widget
- `app/api/chat/route.ts` — Injects GLP-1 coaching context

---

### Phase 3 — Reactive plan adjustment

**Changed:** Wearables now cause Vita to move things, not just display data.

8 deterministic rules that run nightly (Inngest cron) or on `health/daily.updated`:

1. Low recovery + heavy session today → MOVE or LIGHTEN (auto-apply, high confidence)
2. Sleep debt accumulating (3+ short nights) → wind-down block + lighten next sessions (user prompt)
3. GLP-1 muscle-loss risk (<2 resistance sessions in 7 days) → add session (user prompt)
4. Streak of good days (5+ all-habits) → suggest harder block (low confidence, user prompt)
5. Resting HR spike (>7 bpm above median) → SKIP high-intensity (auto-apply, high confidence)
6. Workout completion drift (<50% last 14 days) → suggest dropping to 3 sessions (user prompt)

High-confidence rules apply automatically, then notify user with rationale. Medium/low-confidence surface as ChatSuggestion. All adjustments show what changed and why; users can undo.

**Files:**
- `lib/coach/reactive.ts` — Rules engine + types
- `lib/jobs/reactive-adjust.ts` — Inngest function
- `prisma/schema.prisma` — ReactiveAdjustmentLog model

---

### Phase 4 — Insight moments engine

**Changed:** 10 scripted AI behaviors that fire when conditions match, with cooldowns, priorities, and logging.

At most 1 insight fires per day per user. The engine runs at 7 AM, picks the highest-priority insight that hasn't hit its cooldown, and surfaces it as a Notification.

| # | Insight | Trigger | Cooldown |
|---|---------|---------|----------|
| 1 | Cross-domain catch | Resting HR rising + deadline event this week | 14 days |
| 2 | Streak celebration | 7+ all-habits days + readiness median >65 | 21 days |
| 3 | GLP-1 protein check | Active mode + protein avg <80% of target | 7 days |
| 4 | Trajectory math | Goal >15% behind schedule | 14 days |
| 5 | Travel pre-emption | Upcoming event ≤3 days | 3 days |
| 6 | Overtraining warning | Asked for more + HRV below baseline | 7 days |
| 7 | Pattern spotter | Same weekday habit miss >70% for 3+ weeks | 21 days |
| 8 | Event countdown | 30/14/7 days to avatar event | 7 days |
| 9 | Quiet observation | 5+ consecutive open days | 30 days |
| 10 | Cycle-aware reframe | Tired mention in late-cycle context | 28 days |

**Files:**
- `lib/coach/insights.ts` — 10 InsightMoment definitions
- `lib/jobs/insights.ts` — Inngest runner + evaluateInsights()
- `prisma/schema.prisma` — InsightFiredLog model
- `scripts/seed-insight-test.ts` — Test seed script (run with --insight=N)

---

### Phase 5 — Memory integrity

**Changed:** Vita cannot confidently misremember. Contradiction detection, confidence decay, user audit.

- `UserFact` model: category, key, value, confidence (0-1), source, firstStatedAt, lastConfirmedAt, contradictedAt
- `remember_fact` tool: saves durable facts; detects contradictions and surfaces for confirmation instead of silently overwriting
- `confirm_fact_update` tool: applies confirmed changes after user says yes
- Weekly cron: confidence decays 5% per week for facts not confirmed in 30 days
- System prompt injection with tiered confidence: HIGH facts referenced naturally, MEDIUM with hedging, LOW/stale asked about, never asserted
- `/settings/memory` page updated: UserFacts audit section with confidence indicators, edit, confirm-still-true, and remove
- `/api/facts` route: GET, PATCH, DELETE

**Why:** The council's sharpest critique: "if Vita confidently misremembers, you lose the customer permanently." Trust is the product. Memory failures are existential.

**Files:**
- `lib/vita-tools.ts` — remember_fact, confirm_fact_update tools
- `lib/system-prompt.ts` — Rules 9+10, userFactsContext with confidence tiers
- `lib/jobs/memory-decay.ts` — Weekly confidence decay Inngest job
- `app/api/facts/route.ts` — Facts CRUD
- `app/(app)/settings/memory/page.tsx` — UserFacts audit UI
- `prisma/schema.prisma` — UserFact, FactCategory

---

### Phase 6 — Ritual-mode /today

**Changed:** /today has two modes. RITUAL is the new default.

RITUAL mode layout:
- 100px top padding — deliberate negative space
- Date label (uppercase, small)
- Serif display greeting
- Champagne editorial rule (12px wide)
- One-line intro from readiness score + next workout
- ONE primary action: next scheduled workout as a large card with "Start when ready"
- Habit quick-tiles (first 4, tap to complete)
- Collapsed timeline strip (expandable)
- 3 serif numbers: sessions this week / habits today / streak
- GLP-1 quiet note when active
- Ghosted "Talk to Vita" link — no chrome

Rest day empty state: "Rest is the workout today. Walk if you feel like it. Drink water. Call someone you like." That's the whole screen.

DASHBOARD mode: existing TodayView, unchanged.

**Files:**
- `app/(app)/today/RitualView.tsx` — New ritual mode component
- `app/(app)/today/page.tsx` — Branches on User.todayMode
- `prisma/schema.prisma` — User.todayMode field

---

## Council recommendations applied

| Recommendation | Status |
|---|---|
| Double down: GLP-1 muscle defense as primary wedge | Shipped (Phase 2) |
| Double down: Wearable-as-context for real-time plan adjustment | Shipped (Phase 3) |
| Double down: /today ritual as retention mechanism | Shipped (Phase 6) |
| Cut: 8-gap framing in external communications | Pending (marketing, not code) |
| Cut: VS-body hero example | Shipped (Phase 1) |
| Cut: "Private accountability" as a named gap | Pending (marketing) |
| Sharpest pivot: Lead with GLP-1, pursue telehealth partnerships | Code shipped; BD pending |

---

## Next steps for the team

1. **Deploy to Railway** — push current branch, verify build passes, monitor Railway logs
2. **Personally test ritual mode for 5 mornings** — open /today each morning; if it feels rote, the copy needs work
3. **Run insight test seed** — `npx tsx scripts/seed-insight-test.ts --insight=1 --email=your@email.com` for each of the 10 insights
4. **Update marketing/landing copy** — remove the 8-gap framing, replace with single sharp claim
5. **Pursue GLP-1 telehealth partnership** — this is BD, not code; target semaglutide/tirzepatide prescribers and weight-loss clinics
