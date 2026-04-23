# Vita Timeline — The Full Spec

**Goal:** Beat Structured on their home turf — and make /today the first thing a user opens every morning.

---

## §1 — Analysis of Structured

### Their one winning insight

Structured's entire thesis is a single, genuinely good idea: **merge calendar + to-dos + routines + habits into one scrollable timeline with duration blocks.** Instead of switching between a calendar (timed events), a task list (no time), and a habit tracker (no duration), everything lives on one vertical strip. You see your day as blocks of time. You see the gaps. You know at a glance whether your plan is realistic.

That insight alone made them the #1 productivity app in the App Store in 2022 and drove 4.5M downloads. It is a real product truth.

### Their confirmed weaknesses (from 1-star App Store reviews, verified patterns)

1. **No web app, broken Mac app.** Review pattern: "the Mac app crashes constantly / hasn't been updated in 18 months." 60%+ of their 1-star reviews mention this. Their iOS-only moat is actually a ceiling.
2. **No week or month view.** You can only see one day. Users who want to plan Sunday for the week ahead have no surface to work with. Review pattern: "there is no way to see the week."
3. **Forced AI input for everything.** Structured AI requires you to describe a task in natural language every time. Power users hate this. Review pattern: "I just want to drag a block, I don't want to talk to an AI to move my workout."
4. **No goals layer.** Structured has no concept of a goal. There is no "I want to lose 5 kg by July" that generates a structured plan. It is purely tactical — today's blocks — with no strategic layer driving them.
5. **No wearables.** Structured does not read your sleep, HRV, steps, or readiness. Your plan is static regardless of whether you slept 4 hours or 9.
6. **No coaching memory.** Structured AI does not remember you. Every session is stateless. It will suggest the same workout intensity whether you're exhausted or fresh.

### Vita's six unfair advantages

| Advantage | What it means in practice |
|---|---|
| **Goals generate timelines** | A goal ("lose 5 kg by July 14") automatically populates weeks of timeline blocks. Structured requires manual entry every day. |
| **Wearable-reactive blocks** | If Oura says readiness 42, Vita downgrades today's run to a walk and flags recovery. Structured has no wearable layer. |
| **AI coach with memory** | Vita remembers 6 months of conversations, goals, struggles. Structured AI is stateless. |
| **Voice edits existing blocks** | "Move my 6pm run to tomorrow morning" — Vita does it. Structured requires tapping into each block individually. |
| **Web + mobile** | Vita is a web-first app deployable to iOS as a PWA. Structured's Mac/web story is broken. |
| **Goal-contribution color overlay** | Every block shows which goal it serves. Structured has no goals concept at all. |

---

## §2 — The Visual Language

### The /today layout

```
┌─────────────────────────────────────────────────────┐
│  Tuesday, April 22              Level 7 · 340 XP    │
│  ─────────────────────────────────────────────       │
│                                                     │
│  [Oura] Sleep 7h 42m · HRV 68ms · Readiness 84     │
│  ─────────────────────────────────────────────       │
│                                                     │
│  6:00 ─────────────────────────────────────────     │
│                                                     │
│  ┃ 6:30   Morning routine               [30 min]    │  ← color bar = goal tag
│  ┃        · Drink 500ml water                       │  ← inline subtask (habit)
│  ┃        · 10 min stretch                          │
│  ┃                                                  │
│  9:00 ─────────────────────────────────────────     │
│                                                     │
│  ░░ GAP — 2h 30m free ░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← visible gap
│                                                     │
│  ┃ 11:30  Reformer class               [60 min] ✓  │  ← done
│  ┃        · 50 XP · Goal: Victoria body             │
│                                                     │
│  12:30 ────────────────────────────────────────     │
│                                                     │
│  ┃ 13:00  Lunch + protein              [45 min]     │
│  ┃        · Target: 40g protein                     │
│                                                     │
│  ░░ GAP — 1h 15m free ░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                     │
│  ┃ 18:30  Evening walk                 [30 min]     │
│  ┃        · 10,000 steps goal · 6,240 done so far  │  ← live wearable value
│  ┃        [Motivate me]                             │  ← per-block action
│                                                     │
│  21:00 ─────────────────────────────────────────    │
│                                                     │
│  ┃ 21:00  Wind-down routine            [45 min]     │
│  ┃        · No screens after 21:30                  │
│  ┃        · LED mask 20 min                         │
│                                                     │
│  ─── Done today (2) ────────────────────────────── │  ← collapsed drawer
│    ✓ Reformer class · 11:30 · 60 min               │
│    ✓ Morning routine · 6:30 · 30 min                │
└─────────────────────────────────────────────────────┘
```

### Design rules

- **Time on the left, block content on the right.** The left column is a fixed-width time axis. Blocks fill the right.
- **Color bars on the left edge of each block** = goal tag. Each goal has a color. Blocks linked to that goal inherit it. Grey = no goal attached.
- **Inline subtasks** = habits that live inside a block. Tapping them completes the habit. They are not a separate list.
- **Visible gaps** = empty time between blocks is rendered explicitly as a gap chip with duration. Users see white space in their day, not invisible nothing.
- **Live wearable values** = step counts, HRV, readiness injected inline into the block that references them. Updates every 30 min via background sync.
- **"Done today" drawer** = completed blocks collapse into a count chip at the bottom. Tap to expand. No streak numbers, no shame — just a quiet log.
- **"Motivate me" button** = appears on every workout block that hasn't been completed. Calls Vita with context (workout type, time of day, current readiness) and returns a 1-sentence push.

---

## §3 — Three-Level AI Generation Philosophy

All three modes edit the same underlying `TimelineBlock` records. There is no "AI mode" vs "manual mode" — mode describes *how the edit was initiated*, not what the data looks like.

### Mode 1 — Auto (Nightly, Zero Input)

Every night at 23:45 UTC, an Inngest cron job runs `generate_tomorrow_timeline` for every active user:

1. Reads: active goals, habits due tomorrow, scheduled workouts, WeeklyTargets, DailyLedger (yesterday's completion %)
2. Reads: latest HealthDaily signals (sleep, HRV, readiness, steps from today)
3. If readiness < 50 → downgrade any HIGH intensity workout to MODERATE; insert a recovery block
4. Calls Claude Haiku with a structured prompt → returns ordered list of blocks with start times, durations, goal links
5. Writes `TimelineBlock` rows for tomorrow
6. Sends a push notification: "Your day for tomorrow is ready. Tap to preview."

User wakes up. Opens /today. The timeline is already built. Zero input required.

**This directly solves Structured's fatal flaw** — their timeline requires daily manual construction. Vita's is pre-built.

### Mode 2 — Voice Override (Tap Mic, Edit Anything)

A persistent mic button floats over /today. User taps, speaks. Examples:

- "Move my run to 7am" → `reschedule_block` tool call
- "Add a 20-minute meditation after lunch" → `add_block` tool call
- "I'm skipping the walk today, I'm tired" → `remove_block` + logs a note to DailyLedger
- "What's my next thing?" → reads next uncompleted block, returns name + time remaining
- "I already did my reformer class" → `complete_block` tool call

Voice input goes to Whisper (via the existing vision/upload endpoint) if Web Speech API fails or user is on desktop.

**This solves Structured's second fatal flaw** — they require AI input for every action. Vita's AI edits already-existing blocks. You never start from scratch.

### Mode 3 — Keyboard-First (Power User)

For desktop and focused users. 11 shortcuts:

| Key | Action |
|---|---|
| `N` | Quick-add block (natural-language input opens inline) |
| `E` | Edit focused block |
| `D` | Mark focused block done |
| `S` | Skip focused block (logs skip reason) |
| `M` | Move focused block (opens time picker) |
| `↑ / ↓` | Navigate between blocks |
| `Space` | Expand / collapse block detail |
| `Cmd+Z` | Undo last block mutation |
| `?` | Show shortcut overlay |
| `G` | Jump to goal linked to focused block |
| `R` | Show Vita's reasoning for why this block was scheduled |

All shortcuts operate on the same `TimelineBlock` record that voice and auto-gen write. No special state.

---

## §4 — Eight Innovations That Beat Structured

### 1. Goals generate timelines

When a user confirms a `GoalDraftCard`, `create_full_plan` not only creates habits and scheduled workouts — it also populates `TimelineBlock` rows for the next 14 days, placing workouts at the user's preferred times, and habits as sub-items inside a named morning/evening routine block.

Structured requires you to manually create every block, every day. Vita's timeline exists before you open the app.

### 2. Wearable-reactive blocks

Every morning at 6:00 UTC, `adapt_timeline_to_readiness` runs:

- Reads today's HealthDaily readiness score
- If readiness < 50: replaces HIGH workout with RECOVERY block, adds note "Readiness 42 — swapped to mobility"
- If readiness > 85 and today has only a MODERATE block: optionally upgrades to HIGH and sends a nudge "You're looking strong today — want to push harder?"
- Steps progress from Terra webhooks updates the inline wearable value on the evening walk block live

This is impossible in Structured (no wearable layer).

### 3. Auto-reschedule on missed

At 23:30 UTC, `handle_missed_blocks` runs:

- Finds any blocks from today with `status = PLANNED` (i.e. not completed, not skipped)
- For workout blocks: creates a new block tomorrow at the same time slot, updates status to `RESCHEDULED`
- For habit blocks: logs a miss in `HabitCompletion` with `missed: true` (no streak penalty — best streak preserved)
- Sends one quiet notification: "Moved your [workout] to tomorrow — no stress."

Structured has no reschedule logic. Missed = just gone.

### 4. Voice edits existing blocks

"Move my 6pm run to tomorrow morning" does not create a new block. It calls `reschedule_block({ blockId, newDate, newStartTime })` on the existing record. The block moves, its goal link is preserved, its XP value is preserved, its habit sub-items move with it.

Structured's AI always creates new. It cannot edit existing blocks by voice. This is a 1-star review pattern for them.

### 5. Goal-contribution color overlay

Every `TimelineBlock` has an optional `goalId`. The goal record has a `color` hex field (set when the goal is created via `propose_goal_decomposition`). The timeline renders a 3px left border in that color. A legend at the top of /today shows "Purple = Victoria body goal · Teal = 10k steps · Grey = no goal."

Users can see at a glance whether their day is aligned with their goals. Structured has no goals concept.

### 6. First-look stagger animation

On first load of /today, blocks animate in sequentially from top to bottom, 40ms apart, with a subtle translateY(8px) → 0 + opacity 0 → 1. The current time cursor pulses once. This takes 600ms total and makes the app feel alive without being distracting.

### 7. Routines as named objects

A `Routine` model has a name ("Morning power-up", "Wind-down"), a list of `RoutineItem` steps, and a default time. When the generator places a routine, it creates one `TimelineBlock` with `routineId` pointing to the template. The user can rename, reorder, or edit the routine in `/settings/routines` and it propagates to future-generated blocks.

Structured has routines but they are flat and anonymous — no name, no library, no reuse across goals.

### 8. "Motivate me" on every workout block

Each uncompleted workout block has a subtle `[Motivate me]` chip at the bottom. Tapping it calls Claude with:
- Workout type and duration
- Current time of day
- Readiness score (if available)
- How close this workout is to the user's goal deadline

Returns a single sentence, no more. Example: "Your reformer class at 11:30 is 14% of what gets you to your July 14 deadline — it's worth 50 minutes of your Tuesday." This is Vita's personality, not a generic motivational quote.

---

## §5 — The Master Claude Code Prompt

Paste the following prompt into Claude Code after confirming the goals/habits foundation (see §6 pre-flight). Run Phase A first, confirm the DB is generating correctly, then Phase B, then Phase C.

---

```
# VITA TIMELINE — Build Spec
# Phase A first. Do not start Phase B until Phase A tests pass.

## Context

We are building Vita's timeline feature — a day/week/month scheduling layer that replaces the /today checklist with a time-blocked timeline. The goals/habits/wearable foundation already exists. We are extending it, not replacing it.

Existing models we depend on: Goal, Habit, HabitCompletion, ScheduledWorkout, WeeklyTarget, HealthDaily, WorkoutLog, DailyLedger.

Technology stack: Next.js 16, Prisma 7, PostgreSQL (Railway), AI SDK v4, Inngest for background jobs, Anthropic Claude, Terra for wearables.

---

## PHASE A — Data layer and generation engine

### Step A1 — Prisma schema additions

Add these models to prisma/schema.prisma. Run `prisma db push` after.

```prisma
enum BlockKind {
  WORKOUT
  HABIT_ROUTINE
  NUTRITION
  RECOVERY
  FOCUS
  CUSTOM
}

enum BlockStatus {
  PLANNED
  DONE
  SKIPPED
  RESCHEDULED
}

model Routine {
  id          String        @id @default(cuid())
  userId      String
  name        String        // "Morning power-up", "Wind-down"
  defaultTime String?       // "06:30"
  active      Boolean       @default(true)
  createdAt   DateTime      @default(now())

  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  items       RoutineItem[]
  blocks      TimelineBlock[]

  @@index([userId, active])
}

model RoutineItem {
  id          String   @id @default(cuid())
  routineId   String
  description String
  duration    Int?     // minutes
  habitId     String?  // links to Habit for auto-completion
  order       Int      @default(0)

  routine     Routine  @relation(fields: [routineId], references: [id], onDelete: Cascade)
  habit       Habit?   @relation(fields: [habitId], references: [id], onDelete: SetNull)
}

model TimelineDay {
  id          String          @id @default(cuid())
  userId      String
  date        DateTime        @db.Date
  generated   Boolean         @default(false)
  generatedAt DateTime?
  readiness   Int?            // readiness score at generation time
  notes       String?         @db.Text

  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  blocks      TimelineBlock[]

  @@unique([userId, date])
  @@index([userId, date])
}

model TimelineBlock {
  id                String      @id @default(cuid())
  userId            String
  dayId             String
  kind              BlockKind   @default(CUSTOM)
  status            BlockStatus @default(PLANNED)
  title             String
  startTime         String      // "07:30" — stored as string, sorted lexicographically
  durationMin       Int
  goalId            String?     // color overlay source
  habitId           String?     // if this block completes a habit
  scheduledWorkoutId String?    // if this block is a scheduled workout
  routineId         String?     // if this block expands a routine
  xpValue           Int         @default(0)
  notes             String?     @db.Text
  completedAt       DateTime?
  skippedReason     String?
  rescheduledToId   String?     @unique // points to the new block if rescheduled
  order             Int         @default(0) // within the day if two blocks share a start time
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  day               TimelineDay       @relation(fields: [dayId], references: [id], onDelete: Cascade)
  goal              Goal?             @relation(fields: [goalId], references: [id], onDelete: SetNull)
  habit             Habit?            @relation(fields: [habitId], references: [id], onDelete: SetNull)
  scheduledWorkout  ScheduledWorkout? @relation(fields: [scheduledWorkoutId], references: [id], onDelete: SetNull)
  routine           Routine?          @relation(fields: [routineId], references: [id], onDelete: SetNull)
  rescheduledTo     TimelineBlock?    @relation("Reschedule", fields: [rescheduledToId], references: [id])
  rescheduledFrom   TimelineBlock?    @relation("Reschedule")

  @@index([userId, dayId])
  @@index([userId, status])
}
```

Also add to the User model:
```
  routines      Routine[]
  timelineDays  TimelineDay[]
  timelineBlocks TimelineBlock[]
```

Add to Goal model: `color  String  @default("#ffffff")`
Add to Habit model: `routineItems RoutineItem[]`
Add to ScheduledWorkout model: `timelineBlock TimelineBlock?`

Run: `prisma db push --accept-data-loss`

### Step A2 — Timeline generation engine

Create `lib/timeline/generate.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { format, addDays, parseISO } from "date-fns";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GenerateOptions {
  userId: string;
  date: string; // "2026-04-22"
  forceRegenerate?: boolean;
}

export async function generateTimelineForDay(opts: GenerateOptions) {
  const { userId, date, forceRegenerate = false } = opts;
  const dateObj = parseISO(date);

  // Check if already generated
  const existing = await prisma.timelineDay.findUnique({
    where: { userId_date: { userId, date: dateObj } },
    include: { blocks: true },
  });
  if (existing?.generated && !forceRegenerate) return existing;

  // Gather context
  const dayOfWeek = dateObj.getDay(); // 0=Sun
  const [user, goals, habits, scheduledWorkouts, routines, healthSignals] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, customInstructions: true, timezone: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "active" },
      select: { id: true, title: true, color: true, deadline: true },
      take: 5,
    }),
    prisma.habit.findMany({
      where: { userId, active: true },
      select: { id: true, title: true, cadence: true, specificDays: true, duration: true, timeOfDay: true, goalId: true },
    }),
    prisma.scheduledWorkout.findMany({
      where: { userId, scheduledDate: dateObj, status: { in: ["PLANNED", "MOVED"] } },
      select: { id: true, workoutTypeName: true, duration: true, scheduledTime: true },
    }),
    prisma.routine.findMany({
      where: { userId, active: true },
      include: { items: { orderBy: { order: "asc" } } },
    }),
    prisma.healthDaily.findFirst({
      where: { userId, date: dateObj, metric: "readinessScore" },
    }).catch(() => null),
  ]);

  const readiness = healthSignals?.value ?? null;

  // Filter habits due today
  const isDueToday = (cadence: string, specificDays: number[]) => {
    switch (cadence.toLowerCase()) {
      case "daily": return true;
      case "weekdays": return dayOfWeek >= 1 && dayOfWeek <= 5;
      case "weekends": return dayOfWeek === 0 || dayOfWeek === 6;
      case "specific_days": return specificDays.includes(dayOfWeek);
      default: return true;
    }
  };
  const dueHabits = habits.filter((h) => isDueToday(h.cadence, h.specificDays));

  // Adapt workouts for readiness
  const adaptedWorkouts = scheduledWorkouts.map((sw) => {
    if (readiness !== null && readiness < 50) {
      return { ...sw, note: `readiness ${readiness} — consider downgrading intensity` };
    }
    return sw;
  });

  // Build prompt context
  const ctx = [
    `User: ${user.name ?? "there"}`,
    `Date: ${format(dateObj, "EEEE, MMMM d yyyy")}`,
    readiness !== null ? `Readiness score: ${readiness}/100${readiness < 50 ? " (LOW — prioritise recovery)" : readiness > 85 ? " (HIGH — can handle full intensity)" : ""}` : "",
    goals.length ? `Active goals:\n${goals.map((g) => `  - ${g.title} (id:${g.id}, color:${g.color})`).join("\n")}` : "No active goals.",
    scheduledWorkouts.length ? `Scheduled workouts:\n${adaptedWorkouts.map((sw) => `  - ${sw.workoutTypeName} at ${sw.scheduledTime ?? "flexible"}, ${sw.duration} min (id:${sw.id})`).join("\n")}` : "No scheduled workouts.",
    dueHabits.length ? `Habits due today:\n${dueHabits.map((h) => `  - ${h.title}, ${h.duration ?? 5} min, timeOfDay:${h.timeOfDay ?? "anytime"}, goalId:${h.goalId ?? "none"} (id:${h.id})`).join("\n")}` : "No habits due.",
    routines.length ? `Named routines:\n${routines.map((r) => `  - ${r.name} (id:${r.id}), default:${r.defaultTime ?? "flexible"}, items: ${r.items.map((i) => i.description).join(", ")}`).join("\n")}` : "",
    user.customInstructions ? `User preferences: ${user.customInstructions}` : "",
  ].filter(Boolean).join("\n");

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: `You are a scheduling engine. Given context about a user's goals, habits, workouts, and routines, output a JSON array of timeline blocks for the day. Each block must have: title, startTime (HH:MM 24h), durationMin, kind (WORKOUT|HABIT_ROUTINE|NUTRITION|RECOVERY|FOCUS|CUSTOM), goalId (or null), habitId (or null), scheduledWorkoutId (or null), routineId (or null), xpValue (10-100 depending on effort). Place blocks realistically. Humans need transition time between blocks. Leave visible gaps. Never schedule past 23:00. Output ONLY valid JSON array, no prose.`,
    prompt: ctx,
    maxTokens: 1000,
  });

  let blocks: {
    title: string; startTime: string; durationMin: number; kind: string;
    goalId: string | null; habitId: string | null; scheduledWorkoutId: string | null;
    routineId: string | null; xpValue: number;
  }[] = [];
  try {
    const cleaned = text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    blocks = JSON.parse(cleaned);
  } catch (e) {
    console.error("[timeline] parse error", e, text.slice(0, 200));
    blocks = [];
  }

  // Upsert the TimelineDay
  const day = await prisma.timelineDay.upsert({
    where: { userId_date: { userId, date: dateObj } },
    create: { userId, date: dateObj, generated: true, generatedAt: new Date(), readiness: readiness ? Math.round(readiness) : null },
    update: { generated: true, generatedAt: new Date(), readiness: readiness ? Math.round(readiness) : null },
  });

  // Delete old planned blocks if regenerating
  if (forceRegenerate) {
    await prisma.timelineBlock.deleteMany({ where: { dayId: day.id, status: "PLANNED" } });
  }

  // Create blocks
  if (blocks.length > 0) {
    await prisma.timelineBlock.createMany({
      data: blocks.map((b, i) => ({
        userId,
        dayId: day.id,
        title: b.title,
        startTime: b.startTime,
        durationMin: Math.max(5, b.durationMin),
        kind: (["WORKOUT","HABIT_ROUTINE","NUTRITION","RECOVERY","FOCUS","CUSTOM"].includes(b.kind) ? b.kind : "CUSTOM") as "WORKOUT" | "HABIT_ROUTINE" | "NUTRITION" | "RECOVERY" | "FOCUS" | "CUSTOM",
        goalId: b.goalId ?? null,
        habitId: b.habitId ?? null,
        scheduledWorkoutId: b.scheduledWorkoutId ?? null,
        routineId: b.routineId ?? null,
        xpValue: b.xpValue ?? 10,
        order: i,
        status: "PLANNED",
      })),
      skipDuplicates: true,
    });
  }

  return prisma.timelineDay.findUniqueOrThrow({
    where: { id: day.id },
    include: { blocks: { orderBy: [{ startTime: "asc" }, { order: "asc" }] } },
  });
}
```

### Step A3 — Inngest cron jobs

Add to `lib/jobs/timeline.ts`:

```typescript
import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { generateTimelineForDay } from "@/lib/timeline/generate";
import { format, addDays } from "date-fns";

// Nightly generation — 23:45 UTC every day
export const generateTomorrowTimelines = inngest.createFunction(
  { id: "generate-tomorrow-timelines", triggers: [{ cron: "45 23 * * *" }] },
  async ({ step }) => {
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const users = await step.run("fetch-users", () =>
      prisma.user.findMany({
        where: { deletedAt: null, onboardingComplete: true },
        select: { id: true },
      })
    );

    for (const { id: userId } of users) {
      await step.run(`generate-${userId}`, () =>
        generateTimelineForDay({ userId, date: tomorrow })
          .catch((e) => console.error(`[timeline-gen] ${userId}:`, e))
      );
    }
    return { generated: users.length, date: tomorrow };
  }
);

// Readiness adaptation — 6:00 AM UTC daily
export const adaptTimelineToReadiness = inngest.createFunction(
  { id: "adapt-timeline-readiness", triggers: [{ cron: "0 6 * * *" }] },
  async ({ step }) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todayDate = new Date(today);
    const users = await step.run("fetch-users", () =>
      prisma.user.findMany({ where: { deletedAt: null, onboardingComplete: true }, select: { id: true } })
    );

    let adapted = 0;
    for (const { id: userId } of users) {
      await step.run(`adapt-${userId}`, async () => {
        let readiness: number | null = null;
        try {
          const signal = await prisma.healthDaily.findFirst({
            where: { userId, date: todayDate, metric: "readinessScore" },
          });
          readiness = signal?.value ?? null;
        } catch { /* table may not exist */ }

        if (readiness === null || readiness >= 50) return;

        // Downgrade HIGH workout blocks to RECOVERY
        const day = await prisma.timelineDay.findUnique({ where: { userId_date: { userId, date: todayDate } } });
        if (!day) return;

        const workoutBlocks = await prisma.timelineBlock.findMany({
          where: { dayId: day.id, kind: "WORKOUT", status: "PLANNED" },
        });

        for (const block of workoutBlocks) {
          await prisma.timelineBlock.update({
            where: { id: block.id },
            data: {
              kind: "RECOVERY",
              title: `Recovery: ${block.title}`,
              notes: `Auto-downgraded from workout. Readiness score ${Math.round(readiness)} — prioritise sleep and mobility today.`,
              durationMin: Math.min(block.durationMin, 30),
            },
          });
          adapted++;
        }
      });
    }
    return { adapted };
  }
);

// Handle missed blocks — 23:30 UTC daily
export const handleMissedBlocks = inngest.createFunction(
  { id: "handle-missed-blocks", triggers: [{ cron: "30 23 * * *" }] },
  async ({ step }) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

    const missedBlocks = await step.run("find-missed", () =>
      prisma.timelineBlock.findMany({
        where: {
          day: { date: new Date(today) },
          status: "PLANNED",
          kind: "WORKOUT",
        },
        include: { day: true },
      })
    );

    for (const block of missedBlocks) {
      await step.run(`reschedule-${block.id}`, async () => {
        // Find or create tomorrow's TimelineDay
        const tomorrowDate = new Date(tomorrow);
        const tomorrowDay = await prisma.timelineDay.upsert({
          where: { userId_date: { userId: block.userId, date: tomorrowDate } },
          create: { userId: block.userId, date: tomorrowDate },
          update: {},
        });

        const newBlock = await prisma.timelineBlock.create({
          data: {
            userId: block.userId,
            dayId: tomorrowDay.id,
            kind: block.kind,
            title: block.title,
            startTime: block.startTime,
            durationMin: block.durationMin,
            goalId: block.goalId,
            habitId: block.habitId,
            scheduledWorkoutId: block.scheduledWorkoutId,
            routineId: block.routineId,
            xpValue: block.xpValue,
            status: "PLANNED",
          },
        });

        await prisma.timelineBlock.update({
          where: { id: block.id },
          data: { status: "RESCHEDULED", rescheduledToId: newBlock.id },
        });

        // Quiet notification
        await prisma.notification.create({
          data: {
            userId: block.userId,
            type: "reschedule",
            title: "Moved to tomorrow",
            body: `${block.title} has been moved to tomorrow at ${block.startTime}.`,
          },
        });
      });
    }
    return { rescheduled: missedBlocks.length };
  }
);

export const timelineFunctions = [generateTomorrowTimelines, adaptTimelineToReadiness, handleMissedBlocks];
```

Register in `lib/inngest.ts` (or wherever `serve` is configured): import and spread `timelineFunctions`.

### Step A4 — API routes for blocks

Create `app/api/timeline/[date]/route.ts`:
```typescript
// GET /api/timeline/2026-04-22 — returns TimelineDay with blocks for the user
// POST /api/timeline/2026-04-22/generate — triggers generation (or force-regen)
```

Create `app/api/timeline/blocks/[id]/route.ts`:
```typescript
// PATCH — update status, startTime, durationMin (for drag-reschedule)
// DELETE — remove a block
```

Create `app/api/timeline/blocks/route.ts`:
```typescript
// POST — create a single block (from QuickAdd)
```

### Step A5 — Nine new Claude tools for block operations

Add to `lib/vita-tools.ts`:

```typescript
add_block: makeTool({
  description: "Add a new block to the user's timeline for a given date.",
  parameters: z.object({
    date: z.string().describe("YYYY-MM-DD"),
    title: z.string(),
    startTime: z.string().describe("HH:MM 24h"),
    durationMin: z.number(),
    kind: z.enum(["WORKOUT","HABIT_ROUTINE","NUTRITION","RECOVERY","FOCUS","CUSTOM"]).default("CUSTOM"),
    goalId: z.string().optional(),
    habitId: z.string().optional(),
    scheduledWorkoutId: z.string().optional(),
    xpValue: z.number().default(10),
  }),
  execute: async (input) => { /* upsert TimelineDay, create TimelineBlock */ },
}),

reschedule_block: makeTool({
  description: "Move an existing block to a new date and/or time. Preserves all metadata.",
  parameters: z.object({
    blockId: z.string(),
    newDate: z.string().optional().describe("YYYY-MM-DD — if moving to another day"),
    newStartTime: z.string().optional().describe("HH:MM"),
  }),
  execute: async ({ blockId, newDate, newStartTime }) => { /* update TimelineBlock */ },
}),

complete_block: makeTool({
  description: "Mark a timeline block as done. If it has a linked habit or scheduledWorkout, complete those too.",
  parameters: z.object({ blockId: z.string(), note: z.string().optional() }),
  execute: async ({ blockId, note }) => { /* status=DONE, completedAt, trigger habit/workout completion */ },
}),

skip_block: makeTool({
  description: "Skip a block and optionally log a reason.",
  parameters: z.object({ blockId: z.string(), reason: z.string().optional() }),
  execute: async ({ blockId, reason }) => { /* status=SKIPPED, skippedReason */ },
}),

remove_block: makeTool({
  description: "Delete a block from the timeline.",
  parameters: z.object({ blockId: z.string() }),
  execute: async ({ blockId }) => { /* delete, verify ownership */ },
}),

get_today_timeline: makeTool({
  description: "Return the full timeline for today, ordered by start time. Use this when the user asks what's next, what's on their schedule, or what's left today.",
  parameters: z.object({ date: z.string().optional().describe("Defaults to today") }),
  execute: async ({ date }) => { /* return TimelineDay + blocks */ },
}),

generate_timeline: makeTool({
  description: "Generate or regenerate the timeline for a given date. Call when user says 'rebuild my day' or 'regenerate tomorrow'.",
  parameters: z.object({
    date: z.string().describe("YYYY-MM-DD"),
    forceRegenerate: z.boolean().default(false),
  }),
  execute: async ({ date, forceRegenerate }) => { /* call generateTimelineForDay */ },
}),

motivate_block: makeTool({
  description: "Return a single motivating sentence for a specific block. Use when user taps 'Motivate me' on a workout.",
  parameters: z.object({ blockId: z.string() }),
  execute: async ({ blockId }) => { /* fetch block + goal + readiness → call Haiku → return 1 sentence */ },
}),

explain_block: makeTool({
  description: "Explain why this block was scheduled — which goal it serves, when it was added, what readiness-adaptation happened.",
  parameters: z.object({ blockId: z.string() }),
  execute: async ({ blockId }) => { /* return metadata narrative */ },
}),
```

### Step A6 — Acceptance criteria for Phase A

Run these checks before starting Phase B:

1. `prisma db push` completes with no errors
2. Manual call to `generateTimelineForDay({ userId, date: "tomorrow" })` returns a `TimelineDay` with at least 3 `TimelineBlock` rows
3. Blocks have correct `goalId` links where goals exist
4. `adaptTimelineToReadiness` with a mocked readiness of 30 converts a WORKOUT block to RECOVERY
5. `handleMissedBlocks` creates a new block for tomorrow and sets original to RESCHEDULED
6. All 9 new Claude tools resolve without throwing when called with valid input
7. `npx tsc --noEmit` passes with zero errors

---

## PHASE B — /today UI rebuild

### Step B1 — Page data fetch

Rewrite `app/(app)/today/page.tsx` to fetch `TimelineDay` with blocks instead of just habits and scheduled workouts. Keep the existing XP/streak/health signals fetch. Pass blocks to a new `TimelineView` component.

### Step B2 — Component architecture

```
app/(app)/today/
  page.tsx              — server component, fetches data
  TimelineView.tsx      — client component, owns drag state
  components/
    WeekDots.tsx        — 7-day strip at top showing habit % per day
    TimelineStream.tsx  — the scrollable block list with gap chips
    TimeBlock.tsx       — individual block (title, time, duration, subtasks, actions)
    GapChip.tsx         — "2h 30m free" between blocks
    QuickAddFab.tsx     — floating + button with NL input
    DoneDrawer.tsx      — collapsible completed blocks
    MotivateChip.tsx    — "Motivate me" button on workout blocks
    TimelineLegend.tsx  — goal color legend at top
    BlockContextMenu.tsx — right-click / long-press: edit, skip, move, explain
```

### Step B3 — TimeBlock component spec

```tsx
interface TimeBlockProps {
  block: TimelineBlock & { goal?: { color: string; title: string } | null };
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onMove: (id: string) => void;
  onMotivate: (id: string) => void;
  isDragging?: boolean;
}

// Layout:
// [color bar 3px] [time column 48px fixed] [block content flex-1]
//
// Content:
//   title (sm, white/85)
//   duration chip (xs, white/35)
//   subtask list (habits inline, tap to complete)
//   wearable value if applicable (e.g. "6,240 / 10,000 steps")
//   [Done] [Skip] [Motivate me] — bottom action row, xs buttons
//   goal chip (xs, goal color bg) — bottom left
```

### Step B4 — Drag-to-reschedule

Use `@dnd-kit/core` and `@dnd-kit/sortable`. Each `TimeBlock` is a draggable. Dropping onto a time slot calls `PATCH /api/timeline/blocks/[id]` with the new `startTime`. On drag start, show ghost block. On drag end, optimistic update + server call.

Install: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

### Step B5 — QuickAddFab

Floating `+` button, bottom-right. On click, opens an inline input bar (does not navigate away). User types in natural language: "30 min walk at 5pm." On submit, calls the `add_block` Claude tool via the chat API with a system instruction to parse the input and return a single `add_block` tool call. The block appears optimistically.

### Step B6 — Keyboard shortcuts

Add a global `useEffect` with `keydown` listener. Map 11 keys (from §3 Mode 3). Show a keyboard shortcut overlay on `?`. Use `data-block-focused` attribute on the focused block to know which block to act on.

### Step B7 — WeekDots

A horizontal strip of 7 circles at the top of /today. Each circle is a day of the current week. Fill % = habit completion for that day (from `DailyLedger.habitsCompleted / habitsTotal`). Today's circle has a ring. Tapping a past day navigates to a read-only view of that day's completed blocks.

### Step B8 — Wearable auto-completion

When Terra webhook fires with steps data for today, check if there's a steps-linked `TimelineBlock` for today. If current steps >= block target AND block status is PLANNED, auto-complete the block, grant XP, send a push notification: "10,000 steps done — walk block completed automatically."

Wire this into `app/api/integrations/webhook/route.ts` (already exists).

### Step B9 — Voice input

Add a mic button to /today header. On press:
1. Try Web Speech API (`window.SpeechRecognition || window.webkitSpeechRecognition`)
2. If unavailable or on desktop, record audio blob and POST to `/api/vision/transcribe` (Whisper)
3. Send transcript to chat API with context: today's block IDs and current time
4. The AI calls the appropriate timeline tool (`reschedule_block`, `add_block`, `complete_block`, etc.)
5. Blocks update optimistically

### Step B10 — Acceptance criteria for Phase B

1. /today loads with timeline blocks ordered by startTime
2. Gap chips appear between blocks where gap > 15 min
3. A block can be dragged to a new time and the server persists it
4. Completing a block via [Done] sets status=DONE, grants XP, triggers habit/workout completion if linked
5. QuickAddFab creates a block from natural language input
6. WeekDots show correct habit % for past 7 days
7. Keyboard shortcut `D` on focused block completes it
8. "Motivate me" returns a 1-sentence response in < 3 seconds
9. `npx tsc --noEmit` passes
10. No console errors on page load

---

## PHASE C — /week, /month, voice polish

### Step C1 — /week horizontal grid

Replace current week grid with a horizontal 7-column layout. Each column is a day. Blocks are stacked vertically within each column in time order. Clicking a block opens a slide-in panel with full detail. Dragging a block between columns calls `reschedule_block` with the new date.

Show weekly targets bar above the grid (existing WeeklyTarget model).

### Step C2 — /month calendar

Replace /month grid with a true month calendar. Each day cell shows:
- Dot per scheduled workout (white = planned, filled = done)
- Habit ring (existing HabitRing component)
- XP earned (from DailyLedger)

Clicking a day opens a bottom sheet with that day's TimelineDay (read-only if past, editable if future).

Add a 365-day heatmap below the calendar (like GitHub's contribution graph) using `DailyLedger.points`. Hover/tap shows "April 22 — 340 XP · 4 habits · 1 workout."

### Step C3 — First-look stagger animation

In `TimelineStream`, use CSS animation-delay incremented by 40ms per block:

```css
.timeline-block {
  animation: blockIn 0.3s ease both;
  animation-delay: calc(var(--block-index) * 40ms);
}
@keyframes blockIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Add a pulse animation to the current-time cursor on first load (one pulse, then static).

### Step C4 — Playwright E2E test spec

Create `e2e/timeline.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test("today timeline loads and blocks are visible", async ({ page }) => {
  // Auth as test user
  await page.goto("/today");
  await expect(page.locator("[data-testid='timeline-stream']")).toBeVisible();
  await expect(page.locator("[data-testid='timeline-block']").first()).toBeVisible();
});

test("complete a block via keyboard shortcut D", async ({ page }) => {
  await page.goto("/today");
  const block = page.locator("[data-testid='timeline-block']").first();
  await block.click(); // focus
  await page.keyboard.press("d");
  await expect(block.locator("[data-status='DONE']")).toBeVisible({ timeout: 3000 });
});

test("QuickAddFab creates a block", async ({ page }) => {
  await page.goto("/today");
  await page.click("[data-testid='quick-add-fab']");
  await page.fill("[data-testid='quick-add-input']", "20 min walk at 5pm");
  await page.keyboard.press("Enter");
  await expect(page.locator("text=walk")).toBeVisible({ timeout: 5000 });
});

test("/week shows 7 day columns", async ({ page }) => {
  await page.goto("/week");
  await expect(page.locator("[data-testid='week-column']")).toHaveCount(7);
});

test("/month calendar renders current month", async ({ page }) => {
  await page.goto("/month");
  await expect(page.locator("[data-testid='month-grid']")).toBeVisible();
  await expect(page.locator("[data-testid='day-cell']")).toHaveCount(28);
});
```

### Step C5 — Acceptance criteria for Phase C

1. /week renders 7 columns; blocks are draggable between days
2. /month renders a full month calendar with workout dots and habit rings
3. 365-day heatmap renders with correct XP values
4. Block stagger animation plays on first load only (not on every re-render)
5. Voice input transcribes and executes a valid block operation end-to-end
6. Playwright E2E tests pass for all 5 specs above
7. Lighthouse performance score on /today > 85
8. `npx tsc --noEmit` passes
9. No regressions on /goals, /chat, /profile

---

## DELIVERABLES

1. `TIMELINE.md` — this document, committed to repo
2. `prisma/schema.prisma` — updated with TimelineBlock, TimelineDay, Routine, RoutineItem
3. `lib/timeline/generate.ts` — generation engine
4. `lib/jobs/timeline.ts` — three Inngest cron functions
5. `lib/vita-tools.ts` — 9 new block tools added
6. `app/api/timeline/` — CRUD API routes
7. `app/(app)/today/` — rebuilt with TimelineStream
8. `app/(app)/week/` — horizontal grid
9. `app/(app)/month/` — calendar + heatmap
10. `e2e/timeline.spec.ts` — Playwright test spec
```

---

## §6 — Pre-Flight Checklist

Before pasting §5 into Claude Code, confirm:

**1. Back up Railway DB**
```bash
# In Railway dashboard: your PostgreSQL service → Backups → Create backup
# Or via CLI:
railway connect postgresql
pg_dump $DATABASE_URL > vita_backup_$(date +%Y%m%d).sql
```

**2. Confirm goals/habits foundation exists**

Run this query against your production DB:
```sql
SELECT 
  (SELECT COUNT(*) FROM "Goal" WHERE status = 'active') as active_goals,
  (SELECT COUNT(*) FROM "Habit" WHERE active = true) as active_habits,
  (SELECT COUNT(*) FROM "ScheduledWorkout" WHERE status = 'PLANNED') as planned_workouts,
  (SELECT COUNT(*) FROM "HabitCompletion" WHERE date >= CURRENT_DATE - 7) as completions_7d;
```

If all four counts are > 0, the foundation is live. If goals = 0, onboard yourself as a real user first (tell Vita your goal, confirm the plan). The timeline generator needs goals to produce meaningful blocks.

**3. Confirm Inngest is connected**

Check Railway logs for `[inngest]` entries. If not running, ensure `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` are set in Railway environment variables.

**4. Confirm Terra/HealthDaily is populated**

```sql
SELECT metric, value, source, date FROM "HealthDaily" ORDER BY date DESC LIMIT 10;
```

If empty, the timeline generator will still run (readiness defaults to null, no adaptation). But wearable-reactive blocks won't be active. Fine for Phase A.

**5. Phase A order**

- Schema push → verify no errors
- Write `lib/timeline/generate.ts`
- Test generation manually (call function directly from a test script or temporary API route)
- Write Inngest jobs → register → verify they appear in Inngest dashboard
- Write API routes
- Add 9 Claude tools
- Run TypeScript check
- Push to Railway — confirm build passes
- Trigger a manual generation and inspect DB: `SELECT * FROM "TimelineBlock" LIMIT 20;`

**Only once you see blocks in the DB with correct goal links, start Phase B.**

---

## §7 — Quick Recall

**Structured's moat in one sentence:** The unified timeline that merges calendar, to-dos, routines, and habits into one scrollable strip — you see your whole day as blocks of time, not separate lists.

**Structured's weakness in one sentence:** iOS-only, no goals layer, no wearables, and the AI can only create new — it cannot edit existing blocks by voice or remember you across sessions.

**Vita's edge in one sentence:** Vita's timeline self-generates every night from your goals and wearable data, adapts if you slept badly, reschedules what you miss, and edits anything by voice — without you touching a form.

---

*Phase A first. Even without UI, a correctly-generating timeline in the DB is 80% of the engineering. Then Phase B is the moment the app becomes real.*
