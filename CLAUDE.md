@AGENTS.md

# VITA — PRODUCT PRIORITIES (source of truth)

We are building Vita — an AI private trainer with persistent memory, multi-source wearable integration, and restrained, outcome-driven design. Our target user is a woman aged 25–45 pursuing body-composition + lifestyle goals (Pilates, reformer, hot yoga, running, Victoria's Secret body, wedding prep, postpartum, splits & flexibility). Our moat is conversational depth + memory + wearable trust + personality.

## When deciding what to build next, apply these rules in order:

1. Does it make the `/today` ritual faster, clearer, or more satisfying? (30-second rule)
2. Does it reduce a user's reason to close the app without logging anything?
3. Does it deepen wearable integration?
4. Does it make Vita feel more like a specific person and less like an AI?
5. Does it surface outcomes (not inputs) in weekly/monthly views?

## Rules we always follow

- No streak-shame. Best streak preserved; current streak resets quietly on a miss. Never show "you broke your streak" messaging.
- No public leaderboards. Private accountability only.
- No markdown tables or emoji in the UI prose. Tool call cards only for structured data.
- No generic AI responses. Vita's voice always. Sign with "— Vita".
- No features that require the user to read documentation.
- All data mutations through typed tool calls, never prose.
- Free tier is genuinely useful. Paid tier gates AI conversation depth and advanced analytics, never basic logging.
- Every shipped feature should have a retention hypothesis: what it does to Day 30 retention.
- Outcomes over inputs. "Waist −1.4 cm in 8 weeks" beats "4/5 workouts completed."

## Priority order (do these first, in order)

1. **Goals + habits + calendar** — the /today daily ritual. This is Bet 5. Without it none of the others matter.
2. **Wearable integration** — Terra / Apple Health / Oura. This is the #1 retention lever (4× Day-30 retention vs app-only). Make connecting a wearable the 4th step of onboarding, not a buried setting.
3. **Email system** — re-entry hook. Outcome-driven weekly review ("waist −1.4 cm in 8 weeks, on track for July 14") not input-driven ("4/5 workouts done").
4. **Chat polish** — only tool call cards, no prose for data. Vita's voice is restrained, warm, direct.
5. **Photo + measurement pipeline** — side-by-side photo slider in weekly/monthly review. This is what makes users show friends.

## Competitor awareness

- Strava: benchmark for social. We are not Strava. Private by default.
- Peloton: benchmark for cult. We build cult via Vita's voice, not instructors.
- MyFitnessPal: benchmark for daily ritual. Beat their 30-second ritual.
- Noom: benchmark for psychology + medical bridge. Monitor GLP-1 work.
- Apple Fitness+: benchmark for polish. Ours must be equal or better.

## Metrics we watch

- Day 1, 7, 30 retention (target Day 30 > 30%, stretch > 45%)
- WAU/MAU ratio (target >25%)
- Workout completion rate (target >70%)
- Wearable connection rate (target >60% of actives)
- Session length (target >7 min on /today and /chat)
- Trial-to-paid conversion (target >20%)
- Monthly churn (target <5%)
- Session count per week per user (target >5)

## The 30-second /today ritual (non-negotiable)

Open /today → see greeting + 3 habit tiles + today's workout → tap 2 things → close. Under 30 seconds. This is the hook that forms the habit of opening the app daily. Everything else rides on this.

## When in doubt

Pick the option that gets a user to say "this feels like my app."
