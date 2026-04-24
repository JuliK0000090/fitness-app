/**
 * Insight Moments Engine
 *
 * 10 scripted AI behaviors that fire when specific conditions match.
 * Each insight has: trigger, message, cooldown, priority.
 *
 * At most 1 insight fires per day per user (restraint is the design).
 * Insights are logged for analysis and have cooldown enforcement.
 */

export type InsightMessage = {
  text: string;
  actions?: Array<{ label: string; tool: string; payload: object }>;
};

export type InsightMoment = {
  id: string;
  name: string;
  category: "performance" | "recovery" | "consistency" | "context" | "celebration";
  priority: number; // higher = fires first if multiple match same day
  cooldownDays: number;
  triggerCheck: (ctx: InsightContext) => boolean;
  generateMessage: (ctx: InsightContext) => InsightMessage;
};

export type InsightContext = {
  userId: string;
  // Health
  readinessLast7: number[];         // index 0 = today
  readinessBaseline: number | null; // 30-day median
  restingHrLast7: number[];
  restingHrTrend: "rising" | "falling" | "stable";
  sleepHoursLast7: number[];
  hrvLast7: number[];
  hrvBaseline: number | null;
  // Habits & workouts
  consecutiveAllHabitsDays: number;
  sameDayHabitMissRate: Map<string, number>; // habitId -> miss rate on same weekday
  workoutCompletionLast14: number;           // 0-1
  // Goals
  goalTrajectoryDeviationPct: number | null; // positive = behind schedule
  goalDeadline: Date | null;
  goalTitle: string | null;
  // GLP-1
  glp1Active: boolean;
  glp1ProteinTargetG: number | null;
  glp1ProteinAvg3DayG: number | null;
  glp1Medication: string | null;
  // Events
  upcomingEventName: string | null;
  upcomingEventDaysOut: number | null;
  // Calendar
  hasDeadlineEventThisWeek: boolean;
  calendarEventTitle: string | null;
  // User behavior
  consecutiveOpenDays: number;
  // Chat
  recentUserTopics: string[];
  userMentionedTiredOrHeavy: boolean;
  userAskedForMoreWorkouts: boolean;
  // Pattern
  weakestWeekdayHabitId: string | null;
  weakestWeekdayName: string | null;
  weakestHabitTitle: string | null;
};

export const INSIGHT_MOMENTS: InsightMoment[] = [
  // ── 1. The cross-domain catch (highest priority) ──────────────────────────
  {
    id: "cross_domain_catch",
    name: "Cross-domain catch",
    category: "recovery",
    priority: 100,
    cooldownDays: 14,
    triggerCheck: (ctx) =>
      ctx.restingHrTrend === "rising" &&
      ctx.hasDeadlineEventThisWeek &&
      ctx.restingHrLast7.length >= 5,
    generateMessage: (ctx) => ({
      text: `Your resting HR has been climbing all week. With ${ctx.calendarEventTitle ?? "your upcoming deadline"} coming up, I'm protecting your evenings — moving any late workouts earlier and adding a wind-down block. We can ramp back up once the pressure passes.\n\n— Vita`,
    }),
  },

  // ── 2. The streak-aware celebration ──────────────────────────────────────
  {
    id: "streak_celebration",
    name: "Streak-aware celebration",
    category: "celebration",
    priority: 90,
    cooldownDays: 21,
    triggerCheck: (ctx) =>
      ctx.consecutiveAllHabitsDays >= 7 &&
      ctx.readinessLast7.length >= 5 &&
      ctx.readinessLast7.slice(0, 5).reduce((a, b) => a + b, 0) / 5 > 65,
    generateMessage: (ctx) => {
      const avgReadiness = Math.round(
        ctx.readinessLast7.slice(0, 5).reduce((a, b) => a + b, 0) / 5
      );
      const baselineGain = ctx.readinessBaseline
        ? Math.round(avgReadiness - ctx.readinessBaseline)
        : null;
      return {
        text: `${ctx.consecutiveAllHabitsDays} days of clean execution.${baselineGain && baselineGain > 0 ? ` Your readiness is up ${baselineGain} points from baseline.` : ""} This is what consistency does — your nervous system is settling. Keep going.\n\n— Vita`,
      };
    },
  },

  // ── 3. Protein-aware GLP-1 check ─────────────────────────────────────────
  {
    id: "glp1_protein_check",
    name: "GLP-1 protein deficit",
    category: "context",
    priority: 85,
    cooldownDays: 7,
    triggerCheck: (ctx) =>
      ctx.glp1Active &&
      ctx.glp1ProteinAvg3DayG !== null &&
      ctx.glp1ProteinTargetG !== null &&
      ctx.glp1ProteinAvg3DayG < ctx.glp1ProteinTargetG * 0.8,
    generateMessage: (ctx) => ({
      text: `Protein has been low three days running. On ${ctx.glp1Medication ?? "your GLP-1"}, your appetite quietly drops — but your muscle still needs the same input. Two extra eggs at breakfast, or a protein shake before bed. Small, not dramatic.\n\n— Vita`,
    }),
  },

  // ── 4. The trajectory math ────────────────────────────────────────────────
  {
    id: "trajectory_math",
    name: "Goal trajectory deviation",
    category: "performance",
    priority: 80,
    cooldownDays: 14,
    triggerCheck: (ctx) =>
      ctx.goalTrajectoryDeviationPct !== null &&
      ctx.goalTrajectoryDeviationPct > 15 &&
      ctx.goalDeadline !== null &&
      ctx.goalTitle !== null,
    generateMessage: (ctx) => {
      const weeksLate = Math.round((ctx.goalTrajectoryDeviationPct ?? 0) / 7);
      return {
        text: `Quick math: at the current pace, you'll reach "${ctx.goalTitle}" about ${weeksLate} week${weeksLate !== 1 ? "s" : ""} past the goal date. Two options: accept it — the date is somewhat arbitrary — or add one strength session a week, which is the most efficient lever here. Which feels right?\n\n— Vita`,
        actions: [
          { label: "Add a session", tool: "schedule_workout", payload: {} },
          { label: "Adjust the deadline", tool: "update_goal", payload: {} },
        ],
      };
    },
  },

  // ── 5. The travel pre-emption ─────────────────────────────────────────────
  {
    id: "travel_preemption",
    name: "Travel pre-emption",
    category: "context",
    priority: 75,
    cooldownDays: 3,
    triggerCheck: (ctx) =>
      ctx.upcomingEventDaysOut !== null &&
      ctx.upcomingEventDaysOut <= 3 &&
      ctx.upcomingEventName !== null,
    generateMessage: (ctx) => ({
      text: `I see you have ${ctx.upcomingEventName} coming up in ${ctx.upcomingEventDaysOut} day${ctx.upcomingEventDaysOut !== 1 ? "s" : ""}. I built a 20-minute bodyweight version of any gym sessions for that period — saved to your timeline. Light on travel days; back to normal when you're home.\n\n— Vita`,
    }),
  },

  // ── 6. The nudge against over-doing ──────────────────────────────────────
  {
    id: "overtraining_warning",
    name: "Over-training warning",
    category: "recovery",
    priority: 70,
    cooldownDays: 7,
    triggerCheck: (ctx) =>
      ctx.userAskedForMoreWorkouts &&
      ctx.hrvBaseline !== null &&
      ctx.hrvLast7.length >= 5 &&
      ctx.hrvLast7.slice(0, 5).reduce((a, b) => a + b, 0) / 5 < ctx.hrvBaseline * 0.85,
    generateMessage: () => ({
      text: `I want to be honest — your HRV is telling me you're already at the edge of what your body can absorb. Adding another session right now chips away at the work you've already done. Two weeks from now, when you're fresh, we can absolutely add intensity. Not right now.\n\n— Vita`,
    }),
  },

  // ── 7. The pattern-spotter ────────────────────────────────────────────────
  {
    id: "pattern_spotter",
    name: "Same-weekday habit miss pattern",
    category: "consistency",
    priority: 60,
    cooldownDays: 21,
    triggerCheck: (ctx) =>
      ctx.weakestWeekdayHabitId !== null &&
      ctx.weakestWeekdayName !== null,
    generateMessage: (ctx) => ({
      text: `I noticed: "${ctx.weakestHabitTitle}" gets missed most ${ctx.weakestWeekdayName}s. Want to move it to ${ctx.weakestWeekdayName === "Wednesday" ? "Thursday" : "a different day"}, or drop it to four days a week? Either works — consistency beats frequency.\n\n— Vita`,
      actions: [
        { label: "Update habit", tool: "update_habit", payload: { habitId: ctx.weakestWeekdayHabitId } },
      ],
    }),
  },

  // ── 8. The dress rehearsal reminder ──────────────────────────────────────
  {
    id: "event_countdown",
    name: "Event countdown milestone",
    category: "celebration",
    priority: 55,
    cooldownDays: 7,
    triggerCheck: (ctx) =>
      ctx.upcomingEventDaysOut !== null &&
      (ctx.upcomingEventDaysOut === 30 || ctx.upcomingEventDaysOut === 14 || ctx.upcomingEventDaysOut === 7),
    generateMessage: (ctx) => ({
      text: `${ctx.upcomingEventDaysOut} days to ${ctx.upcomingEventName ?? "your event"}. ${
        ctx.goalTrajectoryDeviationPct !== null && ctx.goalTrajectoryDeviationPct <= 5
          ? "You're on track — keep the same plan and trust it."
          : "Want to add anything specific for the last stretch? I have a few ideas."
      }\n\n— Vita`,
    }),
  },

  // ── 9. The quiet observation (lowest priority, fires often as fallback) ──
  {
    id: "quiet_observation",
    name: "Quiet observation",
    category: "celebration",
    priority: 10,
    cooldownDays: 30,
    triggerCheck: (ctx) => ctx.consecutiveOpenDays >= 5,
    generateMessage: (ctx) => ({
      text: `You've shown up ${ctx.consecutiveOpenDays} days in a row. I notice. That's the part that compounds — not any single workout.\n\n— Vita`,
    }),
  },

  // ── 10. Cycle-aware reframe (opt-in, fires only when data present) ────────
  {
    id: "cycle_aware_reframe",
    name: "Cycle-aware reframe",
    category: "recovery",
    priority: 65,
    cooldownDays: 28,
    triggerCheck: (ctx) =>
      ctx.userMentionedTiredOrHeavy &&
      ctx.recentUserTopics.some((t) =>
        ["tired", "heavy", "sluggish", "off", "slow"].some((kw) => t.toLowerCase().includes(kw))
      ),
    generateMessage: () => ({
      text: `What feels like "I'm losing it" might actually be "I'm running on a different operating system this week." The body works harder for the same output in the later part of the cycle. Lighter is correct, not lazy. I'll adjust the intensity for the next few days.\n\n— Vita`,
    }),
  },
];

/** Sort insights by priority descending (highest fires first) */
export const INSIGHTS_BY_PRIORITY = [...INSIGHT_MOMENTS].sort((a, b) => b.priority - a.priority);
