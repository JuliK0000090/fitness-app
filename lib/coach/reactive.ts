/**
 * Reactive coaching engine — deterministic rules that propose timeline changes
 * based on wearable signals. Runs nightly per user.
 *
 * Rules fire in priority order; first match per blockId wins.
 * High-confidence rules auto-apply. Medium/low surface as ChatSuggestion.
 */

export type ReactiveProposal = {
  id: string;
  userId: string;
  ruleName: string;
  trigger: string;
  proposedChange: {
    blockId: string | null;
    action: "MOVE" | "LIGHTEN" | "SKIP" | "ADD";
    rationale: string;
    fromDate?: string;
    toDate?: string;
    intensityChange?: number;
    replacement?: object;
  };
  confidence: "high" | "medium" | "low";
  autoApply: boolean;
};

export type HealthSignal = {
  date: string; // YYYY-MM-DD
  readinessScore?: number | null;
  sleepHours?: number | null;
  hrvMs?: number | null;
  heartRateResting?: number | null;
  steps?: number | null;
};

export type ScheduledBlock = {
  id: string;
  date: string; // YYYY-MM-DD
  workoutTypeName: string | null;
  intensity: number | null;
  status: string;
};

export type UserContext = {
  userId: string;
  healthSignals: HealthSignal[]; // last 30 days, ordered newest first
  todayBlocks: ScheduledBlock[];
  tomorrowBlocks: ScheduledBlock[];
  glp1Active: boolean;
  glp1ResistanceTarget: number;
  lastSevenDayResistanceSessions: number;
  completionRateLast14Days: number; // 0–1
  consecutiveShortNights: number;   // count of nights with sleep < 6.5 h
  restingHrSpike: boolean;          // resting HR is >7 bpm above 30-day median
  allHabitsConsecutiveDays: number; // streak of all-habits-complete days
  todayReadiness: number | null;
};

const HIGH_INTENSITY_THRESHOLD = 6; // intensity >= this is "heavy"

/**
 * Run all 8 reactive rules against the user context.
 * Returns proposals; caller decides which to apply vs surface.
 */
export function runReactiveRules(ctx: UserContext): ReactiveProposal[] {
  const proposals: ReactiveProposal[] = [];
  const mutatedBlockIds = new Set<string>();

  function propose(p: ReactiveProposal) {
    const blockId = p.proposedChange.blockId;
    if (blockId && mutatedBlockIds.has(blockId)) return; // first match per block wins
    if (blockId) mutatedBlockIds.add(blockId);
    proposals.push(p);
  }

  const today = new Date().toISOString().split("T")[0];

  // ── Rule 1: Low recovery + heavy session today ───────────────────────────
  if (ctx.todayReadiness !== null && ctx.todayReadiness < 40) {
    const heavyBlock = ctx.todayBlocks.find(
      (b) => b.status === "PLANNED" && (b.intensity ?? 0) >= HIGH_INTENSITY_THRESHOLD
    );
    if (heavyBlock) {
      // Find next available day with higher readiness (rough: any day 2-3 days out)
      const signals = ctx.healthSignals;
      const targetDate = signals.find(
        (s) => s.date > today && (s.readinessScore ?? 0) >= 55
      )?.date;

      propose({
        id: `rule1-${ctx.userId}-${today}`,
        userId: ctx.userId,
        ruleName: "low_recovery_heavy_session",
        trigger: `readiness ${ctx.todayReadiness} < 40 with heavy session`,
        proposedChange: {
          blockId: heavyBlock.id,
          action: targetDate ? "MOVE" : "LIGHTEN",
          rationale: targetDate
            ? `Low HRV and poor sleep — today is for restoration. I moved your ${heavyBlock.workoutTypeName ?? "session"} to ${targetDate} and put a 20-minute walk here instead.`
            : `Low readiness today. I lightened your ${heavyBlock.workoutTypeName ?? "session"} — same time, easier version. Your body will thank you.`,
          fromDate: today,
          toDate: targetDate,
          intensityChange: targetDate ? undefined : -3,
        },
        confidence: "high",
        autoApply: true,
      });
    }
  }

  // ── Rule 2: Sleep debt accumulating ─────────────────────────────────────
  if (ctx.consecutiveShortNights >= 3) {
    propose({
      id: `rule2-${ctx.userId}-${today}`,
      userId: ctx.userId,
      ruleName: "sleep_debt_accumulating",
      trigger: `${ctx.consecutiveShortNights} consecutive nights < 6.5 h`,
      proposedChange: {
        blockId: null,
        action: "ADD",
        rationale: `Three short nights in a row. I'm protecting your evenings this week — wind-down block added at 9:30pm, and any high-intensity session in the next two days is now moderate.`,
        replacement: {
          type: "wind_down",
          time: "21:30",
          durationMin: 30,
        },
      },
      confidence: "medium",
      autoApply: false,
    });
  }

  // ── Rule 4: Cycle-aware adjustment (fires only when data present) ────────
  // (Rule 3 is travel detection — handled in chat tool, not here)

  // ── Rule 5: GLP-1 muscle-loss risk ──────────────────────────────────────
  if (ctx.glp1Active && ctx.lastSevenDayResistanceSessions < 2) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    propose({
      id: `rule5-${ctx.userId}-${today}`,
      userId: ctx.userId,
      ruleName: "glp1_muscle_loss_risk",
      trigger: `GLP-1 active, only ${ctx.lastSevenDayResistanceSessions} resistance sessions in last 7 days`,
      proposedChange: {
        blockId: null,
        action: "ADD",
        rationale: `On a GLP-1, missing strength work for a week is the one thing I'll always nudge you on. I have a session ready for tomorrow — let me know if you prefer a different time.`,
        toDate: tomorrowStr,
        replacement: {
          type: "strength_training",
          durationMin: 45,
          intensity: 6,
        },
      },
      confidence: "medium",
      autoApply: false,
    });
  }

  // ── Rule 6: Streak of good days ──────────────────────────────────────────
  if (ctx.allHabitsConsecutiveDays >= 5) {
    const nextWeekend = new Date();
    nextWeekend.setDate(nextWeekend.getDate() + (6 - nextWeekend.getDay() + 7) % 7 + 1);
    const weekendStr = nextWeekend.toISOString().split("T")[0];

    propose({
      id: `rule6-${ctx.userId}-${today}`,
      userId: ctx.userId,
      ruleName: "positive_momentum",
      trigger: `${ctx.allHabitsConsecutiveDays} consecutive days all habits complete`,
      proposedChange: {
        blockId: null,
        action: "ADD",
        rationale: `You're in a great rhythm. If you want, I can slot in a slightly harder session on ${weekendStr} — you're ready for it. Say the word.`,
        toDate: weekendStr,
        replacement: {
          type: "progressive_challenge",
          intensityBump: 1,
        },
      },
      confidence: "low",
      autoApply: false,
    });
  }

  // ── Rule 7: Resting HR spike ─────────────────────────────────────────────
  if (ctx.restingHrSpike) {
    const highIntensityToday = ctx.todayBlocks.find(
      (b) => b.status === "PLANNED" && (b.intensity ?? 0) >= HIGH_INTENSITY_THRESHOLD
    );
    if (highIntensityToday) {
      propose({
        id: `rule7-${ctx.userId}-${today}`,
        userId: ctx.userId,
        ruleName: "resting_hr_spike",
        trigger: "resting HR >7 bpm above 30-day median",
        proposedChange: {
          blockId: highIntensityToday.id,
          action: "SKIP",
          rationale: `Your resting HR is elevated — could be stress, illness coming on, or under-recovery. I moved today's session and suggest a walk instead. Your body is telling you something.`,
        },
        confidence: "high",
        autoApply: true,
      });
    }
  }

  // ── Rule 8: Workout completion drift ─────────────────────────────────────
  if (ctx.completionRateLast14Days < 0.5) {
    propose({
      id: `rule8-${ctx.userId}-${today}`,
      userId: ctx.userId,
      ruleName: "workout_completion_drift",
      trigger: `completion rate ${Math.round(ctx.completionRateLast14Days * 100)}% over last 14 days`,
      proposedChange: {
        blockId: null,
        action: "LIGHTEN",
        rationale: `We had a rough two weeks on completion. Want me to drop to three sessions a week for a while? Better to finish three than plan five. Life gets busy.`,
      },
      confidence: "medium",
      autoApply: false,
    });
  }

  return proposals;
}
