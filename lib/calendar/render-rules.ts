/**
 * Single source of truth for status → calendar visual mapping.
 *
 * Calibrated to the actual schema:
 *   - WorkoutStatus: PLANNED | DONE | SKIPPED | MOVED | MISSED | AUTO_SKIPPED
 *   - CompletionStatus: DONE | MISSED | SKIPPED | PENDING
 *
 * Every calendar must import dotsForDay() and ringForDay() — never compute
 * a colour inline. Future days NEVER return a "done" colour or show a ring.
 *
 * See PLANNER_HEALTH.md for the full rule table.
 */

import { CompletionStatus, WorkoutStatus } from "@prisma/client";

export type DayPhase = "past" | "today" | "future";

export type WorkoutForRender = {
  status: WorkoutStatus;
  source?: string | null; // "ai_suggested" → Vita-suggests dot
};

export type HabitCompletionForRender = {
  status: CompletionStatus;
};

export type CalendarDayState = {
  phase: DayPhase;
  workouts: WorkoutForRender[];
  /** Real HabitCompletion rows that exist for this day. */
  habitCompletions: HabitCompletionForRender[];
  /** How many active habits the user expects to do on this date. */
  totalHabitsForDay: number;
};

export type DotColor = "done" | "planned" | "suggests" | "skipped" | "missed";
export type RingColor = "done" | "partial" | "missed";

export type DotRenderSpec = {
  color: DotColor;
  size: "sm" | "md";
};

export type RingRenderSpec = {
  show: boolean;
  fillRatio: number; // 0..1
  color: RingColor;
};

/**
 * Decide which dots render for a day's workouts. Future days can ONLY produce
 * "planned" or "suggests" dots — any other status on a future date is a data
 * bug and is logged + skipped.
 */
export function dotsForDay(state: CalendarDayState): DotRenderSpec[] {
  const dots: DotRenderSpec[] = [];

  for (const w of state.workouts) {
    if (state.phase === "future") {
      // Future is for predictions. ai_suggested → Vita suggests; anything
      // else PLANNED → Planned. Anything else (DONE/MISSED/...) on a future
      // date is data corruption — surface and skip.
      if (w.status === "PLANNED") {
        dots.push({
          color: w.source === "ai_suggested" ? "suggests" : "planned",
          size: "md",
        });
      } else if (w.status === "MOVED") {
        // A workout moved INTO a future date by user or replanner — render as planned.
        dots.push({ color: "planned", size: "md" });
      } else {
        if (typeof console !== "undefined") {
          console.warn(`[calendar] unexpected future workout status: ${w.status}`);
        }
      }
      continue;
    }

    // past or today
    switch (w.status) {
      case "DONE":
        dots.push({ color: "done", size: "md" });
        break;
      case "SKIPPED":
      case "AUTO_SKIPPED":
        dots.push({ color: "skipped", size: "md" });
        break;
      case "MISSED":
        dots.push({ color: "missed", size: "md" });
        break;
      case "PLANNED":
        // Today + still PLANNED = upcoming this evening. Past + still PLANNED
        // = bug (rollover hasn't run); render as missed so it's visible.
        if (state.phase === "today") {
          dots.push({
            color: w.source === "ai_suggested" ? "suggests" : "planned",
            size: "md",
          });
        } else {
          dots.push({ color: "missed", size: "md" });
        }
        break;
      case "MOVED":
        // MOVED on past/today means the user/replanner relocated this row
        // somewhere else. Don't render — the new placement gets its own dot.
        break;
    }
  }

  return dots;
}

/**
 * Decide whether a habit-completion ring renders, and how full it is.
 * Future days NEVER show a ring. Days with no expected habits don't either.
 */
export function ringForDay(state: CalendarDayState): RingRenderSpec {
  if (state.phase === "future") return { show: false, fillRatio: 0, color: "partial" };
  if (state.totalHabitsForDay === 0) return { show: false, fillRatio: 0, color: "partial" };

  const done = state.habitCompletions.filter((c) => c.status === "DONE").length;
  const ratio = Math.min(1, done / state.totalHabitsForDay);

  if (ratio >= 1) return { show: true, fillRatio: 1, color: "done" };
  if (ratio > 0) return { show: true, fillRatio: ratio, color: "partial" };
  return { show: true, fillRatio: 0, color: "missed" };
}

/** Compute phase relative to today (UTC date string). */
export function dayPhase(dateStr: string, todayStr: string): DayPhase {
  if (dateStr < todayStr) return "past";
  if (dateStr === todayStr) return "today";
  return "future";
}

/** Tailwind class for each dot colour. */
export const DOT_CLASS: Record<DotColor, string> = {
  done: "bg-champagne",
  planned: "bg-border-strong",
  suggests: "bg-border-default ring-[0.5px] ring-border-default",
  skipped: "bg-border-subtle",
  missed: "bg-terracotta/40",
};

/** Tailwind stroke for the ring SVG. */
export const RING_STROKE: Record<RingColor, string> = {
  done: "stroke-champagne",
  partial: "stroke-champagne/45",
  missed: "stroke-terracotta/40",
};
