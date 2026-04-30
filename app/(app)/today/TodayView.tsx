"use client";

import { useState, useTransition, useOptimistic, useEffect } from "react";
import Link from "next/link";
import {
  Bell, X, MessageSquarePlus, CheckCircle2, Circle, Clock,
  Dumbbell, Activity, Footprints, Droplets, Wind, Zap, Sun,
  Moon, Beef, Heart, Camera, ChevronDown, ChevronUp, CalendarDays,
  Check, ArrowRight, Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { completeHabit, uncompleteHabit, completeWorkout, skipWorkout, deleteHabit } from "@/app/actions/habits";
import { SignalsSection, type SignalsData } from "@/components/dashboard/SignalsSection";
import { EditorialRule } from "@/components/ui/editorial-rule";
import { PlannerBanner, ReplanSuggestion, ConstraintHeadsUp } from "@/components/planner/PlannerBanner";

const ICON_MAP: Record<string, React.ElementType> = {
  CheckCircle: CheckCircle2, CheckCircle2, Circle, Footprints, Droplets, Wind, Zap, Sun, Moon,
  Beef, Heart, Camera, Dumbbell, Activity, Flame, Clock,
};
function HabitIcon({ name, size = 14, className }: { name: string; size?: number; className?: string }) {
  const Comp = ICON_MAP[name] ?? CheckCircle2;
  return <Comp size={size} strokeWidth={1.5} className={className} />;
}

interface ScheduledWorkout {
  id: string;
  name: string;
  scheduledTime: string | null;
  duration: number;
  status: string;
}

interface WeeklyTarget {
  id: string;
  label: string;
  icon: string;
  target: number;
  done: number;
}

interface Habit {
  id: string;
  title: string | null;
  icon: string;
  duration: number | null;
  pointsOnComplete: number;
  done: boolean;
  // Wearable resolution. When trackingMode != 'MANUAL', the row renders
  // as a no-checkbox progress / outcome line driven by HealthDaily.
  trackingMode?: "MANUAL" | "WEARABLE_AUTO" | "HYBRID";
  metricKey?: string | null;
  metricTarget?: number | null;
  wearableValue?: number | null; // today's value from HealthDaily
}

interface TodayViewProps {
  userName: string;
  dateLabel: string;
  level: number;
  totalXp: number;
  xpToNext: number;
  xpPct: number;
  currentStreak: number;
  habits: Habit[];
  scheduledWorkouts: ScheduledWorkout[];
  weeklyTargets: WeeklyTarget[];
  notifications: { id: string; title: string; body: string }[];
  hasGoals: boolean;
  showHealthBanner: boolean;
  readinessScore: number | null;
  todaySteps: number | null;
  plannerReplan: ReplanSuggestion | null;
  plannerConstraintsToday: ConstraintHeadsUp[];
  partnerNote: { id: string; partnerName: string; message: string; sentAt: string } | null;
  signalsData: SignalsData | null;
}

const HABITS_VISIBLE_DEFAULT = 5;
const HEALTH_BANNER_KEY = "vita.banner.apple-health.dismissedAt";
const HEALTH_BANNER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function formatMetricValue(value: number, metricKey: string): string {
  switch (metricKey) {
    case "steps":
      return Math.round(value).toLocaleString();
    case "sleepHours": {
      const h = Math.floor(value);
      const m = Math.round((value - h) * 60);
      return `${h}h ${m}m`;
    }
    case "activeMinutes":
    case "exerciseMinutes":
    case "workoutMinutes":
      return `${Math.round(value)} min`;
    case "restingHr":
    case "heartRateAvg":
      return `${Math.round(value)} bpm`;
    case "hrvMs":
      return `${Math.round(value)} ms`;
    default:
      return String(Math.round(value));
  }
}

function parseStepTarget(title: string | null): number | null {
  if (!title) return null;
  const m = title.match(/(\d[\d,]*)k?\s*steps?/i);
  if (!m) return null;
  const raw = parseInt(m[1].replace(/,/g, ""), 10);
  const isK = /\d+k\s*steps?/i.test(title);
  return isK ? raw * 1000 : raw;
}

function readinessSentence(score: number): string {
  if (score <= 40) return "Readiness is low. Prioritise rest or gentle movement today.";
  if (score <= 70) return "Readiness is steady. A good day to stay consistent.";
  return "Readiness is high. Push if you want to.";
}

export function TodayView({
  userName, dateLabel, level, totalXp, xpToNext, xpPct, currentStreak,
  habits: initHabits, scheduledWorkouts: initWorkouts, weeklyTargets,
  notifications: initNotifications, hasGoals, showHealthBanner,
  readinessScore, todaySteps,
  plannerReplan, plannerConstraintsToday,
  partnerNote: _partnerNote,
  signalsData,
}: TodayViewProps) {
  const [notifications, setNotifications] = useState(initNotifications);
  const [editMode, setEditMode] = useState(false);
  const [habitsExpanded, setHabitsExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const [bannerVisible, setBannerVisible] = useState(showHealthBanner);
  useEffect(() => {
    if (!showHealthBanner) return;
    try {
      const dismissed = localStorage.getItem(HEALTH_BANNER_KEY);
      if (dismissed && Date.now() - Number(dismissed) <= HEALTH_BANNER_TTL_MS) {
        setBannerVisible(false);
      }
    } catch { /* ignore */ }
  }, [showHealthBanner]);

  function dismissBanner() {
    try { localStorage.setItem(HEALTH_BANNER_KEY, String(Date.now())); } catch { /* ignore */ }
    setBannerVisible(false);
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const [optimisticHabits, updateOptimisticHabits] = useOptimistic(
    initHabits,
    (state: Habit[], { id, done }: { id: string; done: boolean }) =>
      state.map((h) => h.id === id ? { ...h, done } : h)
  );

  function toggleHabit(habit: Habit) {
    startTransition(async () => {
      updateOptimisticHabits({ id: habit.id, done: !habit.done });
      if (habit.done) {
        await uncompleteHabit(habit.id);
      } else {
        await completeHabit(habit.id);
        toast.success(`Habit logged`);
      }
    });
  }

  async function dismissNotification(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const doneCount = optimisticHabits.filter((h) => h.done).length;
  const totalCount = optimisticHabits.length;
  const visibleHabits = habitsExpanded || totalCount <= HABITS_VISIBLE_DEFAULT
    ? optimisticHabits
    : optimisticHabits.slice(0, HABITS_VISIBLE_DEFAULT);
  const hiddenCount = totalCount - HABITS_VISIBLE_DEFAULT;

  return (
    <div className="max-w-xl mx-auto px-5 pt-14 pb-24 space-y-10">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-label tracking-widest uppercase text-champagne font-sans font-medium">
          {dateLabel}
        </p>
        <h1 className="font-serif text-display-lg font-light text-text-primary leading-tight">
          {greeting}, {userName}
        </h1>
        {readinessScore !== null && (
          <p className="text-body text-text-muted mt-1">{readinessSentence(readinessScore)}</p>
        )}
        <EditorialRule />
      </div>

      {/* ── Apple Health banner ──────────────────────────────────────────── */}
      {bannerVisible && (
        <div className="flex items-start gap-4 p-4 rounded-md border border-champagne/15 bg-champagne/5">
          <Heart size={14} strokeWidth={1.5} className="text-champagne shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-body-sm text-text-primary font-medium">Connect Apple Health</p>
            <p className="text-caption text-text-muted mt-0.5">
              See your steps, sleep, and workouts here automatically.
            </p>
            <Link href="/settings/integrations/apple-health"
              className="inline-flex items-center gap-1 mt-2 text-caption text-champagne hover:text-champagne-soft transition-colors">
              Set up <ArrowRight size={10} strokeWidth={1.5} />
            </Link>
          </div>
          <button onClick={dismissBanner} className="text-text-disabled hover:text-text-muted transition-colors shrink-0" aria-label="Dismiss">
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* ── Level + XP ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="space-y-0.5">
            <p className="text-label tracking-widest uppercase text-champagne font-sans font-medium">Progress</p>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-display-sm font-light text-text-primary">
                Level {level}
              </span>
              {currentStreak > 0 && (
                <span className="text-caption text-text-muted">
                  {currentStreak} day streak
                </span>
              )}
            </div>
          </div>
          <span className="text-caption text-text-disabled tabular-nums">{totalXp.toLocaleString()} XP</span>
        </div>
        {/* Progress bar — 2px, restrained */}
        <div className="h-px w-full bg-border-subtle overflow-hidden rounded-full">
          <div className="h-full bg-champagne transition-all duration-500" style={{ width: `${xpPct}%` }} />
        </div>
        <p className="text-caption text-text-disabled">{xpToNext.toLocaleString()} XP to Level {level + 1}</p>
      </div>

      {/* ── Planner heads-up + recent re-plan banner ──────────────────────── */}
      <PlannerBanner replan={plannerReplan} constraintsToday={plannerConstraintsToday} />

      {/* ── Health signals ───────────────────────────────────────────────── */}
      {signalsData ? <SignalsSection data={signalsData} /> : null}

      {/* ── Notifications ───────────────────────────────────────────────── */}
      {notifications.map((n) => (
        <div key={n.id} className="flex gap-3 p-4 rounded-md border border-border-subtle bg-bg-surface">
          <Bell size={13} strokeWidth={1.5} className="text-text-disabled shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-medium text-text-primary">{n.title}</p>
            <p className="text-caption text-text-muted line-clamp-2 mt-0.5">{n.body}</p>
          </div>
          <button onClick={() => dismissNotification(n.id)}
            className="p-1 rounded text-text-disabled hover:text-text-muted transition-colors shrink-0">
            <X size={11} strokeWidth={1.5} />
          </button>
        </div>
      ))}

      {/* ── Today's workouts ─────────────────────────────────────────────── */}
      {initWorkouts.length > 0 && (
        <div className="space-y-3">
          <p className="text-label tracking-widest uppercase text-text-muted font-sans font-medium">Today</p>
          {initWorkouts.map((sw) => (
            <TodayWorkoutCard key={sw.id} workout={sw} />
          ))}
        </div>
      )}

      {/* ── Habit checklist ──────────────────────────────────────────────── */}
      {totalCount > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-label tracking-widest uppercase text-text-muted font-sans font-medium">
              Daily habits
            </p>
            <div className="flex items-center gap-3">
              <span className="text-caption text-text-disabled tabular-nums">{doneCount}/{totalCount}</span>
              <button
                onClick={() => setEditMode((v) => !v)}
                className="text-caption text-text-muted hover:text-text-secondary transition-colors"
              >
                {editMode ? "Done" : "Edit"}
              </button>
            </div>
          </div>

          {/* Timeline-style habit list */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border-subtle" />

            <div className="space-y-0">
              {visibleHabits.map((habit) => {
                const isWearable = habit.trackingMode === "WEARABLE_AUTO" || habit.trackingMode === "HYBRID";
                const wearableValue = habit.wearableValue ?? null;
                const wearableTarget = habit.metricTarget ?? null;
                const wearableMet = isWearable && wearableValue !== null && wearableTarget !== null && wearableValue >= wearableTarget;
                const wearablePct = isWearable && wearableValue !== null && wearableTarget && wearableTarget > 0
                  ? Math.min(100, (wearableValue / wearableTarget) * 100)
                  : null;

                // Legacy step-progress on a manual habit titled "10,000 steps"
                // (kept as a fallback for any pre-migration habit that still
                // lacks the metric trio).
                const legacyStepTarget = !isWearable ? parseStepTarget(habit.title) : null;
                const legacyStepProgress = legacyStepTarget && todaySteps !== null
                  ? Math.min(100, (todaySteps / legacyStepTarget) * 100) : null;

                return (
                  <div key={habit.id} className="flex items-start group">
                    {/* Indicator dot — checkbox for manual, sage check / outline for wearable */}
                    {editMode ? (
                      <button
                        onClick={() => startTransition(async () => { await deleteHabit(habit.id); })}
                        className="relative z-10 w-3 h-3 mt-3 mr-5 shrink-0 flex items-center justify-center rounded-full border border-terracotta/40 hover:border-terracotta hover:bg-terracotta-soft transition-colors"
                        aria-label="Delete habit"
                      >
                        <X size={7} strokeWidth={2} className="text-terracotta" />
                      </button>
                    ) : isWearable ? (
                      <span
                        className="relative z-10 w-3 h-3 mt-3 mr-5 shrink-0 flex items-center justify-center"
                        aria-label={wearableMet ? "Goal met from wearable" : "Tracking from wearable"}
                        title="Tracked automatically from your wearable"
                      >
                        {wearableMet ? (
                          <span className="flex w-3 h-3 items-center justify-center rounded-full bg-sage">
                            <Check size={7} strokeWidth={2.5} className="text-bg-base" />
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full border border-border-strong" />
                        )}
                      </span>
                    ) : (
                      <button
                        onClick={() => toggleHabit(habit)}
                        className="relative z-10 w-3 h-3 mt-3 mr-5 shrink-0"
                        aria-label={habit.done ? "Mark incomplete" : "Mark complete"}
                      >
                        {habit.done ? (
                          <span className="flex w-3 h-3 items-center justify-center rounded-full bg-champagne">
                            <Check size={7} strokeWidth={2.5} className="text-champagne-fg" />
                          </span>
                        ) : (
                          <span className="flex w-3 h-3 items-center justify-center rounded-full border border-border-strong group-hover:border-champagne/50 transition-colors" />
                        )}
                      </button>
                    )}

                    {/* Content */}
                    <div className={cn(
                      "flex-1 py-2.5 border-b border-border-subtle last:border-0 min-w-0",
                      "transition-opacity duration-200",
                      (habit.done || wearableMet) && "opacity-50"
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-body text-text-primary",
                          (habit.done || wearableMet) && "line-through text-text-muted"
                        )}>
                          {habit.title ?? "Habit"}
                        </p>
                        <HabitIcon name={habit.icon} size={13} className="text-text-disabled shrink-0" />
                      </div>

                      {/* Wearable progress (no checkbox needed — auto-resolves) */}
                      {isWearable && wearableTarget !== null && (
                        <div className="mt-1.5 space-y-1">
                          <p className="text-caption text-text-muted tabular-nums">
                            {wearableValue !== null
                              ? `${formatMetricValue(wearableValue, habit.metricKey ?? "")} / ${formatMetricValue(wearableTarget, habit.metricKey ?? "")}`
                              : `Waiting on wearable sync · target ${formatMetricValue(wearableTarget, habit.metricKey ?? "")}`}
                          </p>
                          {wearablePct !== null && (
                            <div className="h-px w-full bg-border-subtle rounded-full overflow-hidden">
                              <div className={cn(
                                "h-full transition-all duration-500",
                                wearableMet ? "bg-sage" : "bg-champagne"
                              )}
                                style={{ width: `${wearablePct}%` }} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Legacy step-progress fallback */}
                      {legacyStepTarget && todaySteps !== null && !habit.done && (
                        <div className="mt-1.5 space-y-1">
                          <p className="text-caption text-text-muted tabular-nums">
                            {todaySteps.toLocaleString()} / {legacyStepTarget.toLocaleString()}
                          </p>
                          <div className="h-px w-full bg-border-subtle rounded-full overflow-hidden">
                            <div className="h-full bg-champagne transition-all duration-500"
                              style={{ width: `${legacyStepProgress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Duration — only if no progress UI */}
                      {!isWearable && !legacyStepTarget && habit.duration && !habit.done && (
                        <p className="text-caption text-text-muted mt-0.5">{habit.duration} min</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expand/collapse */}
          {totalCount > HABITS_VISIBLE_DEFAULT && (
            <button
              onClick={() => setHabitsExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-caption text-text-muted hover:text-text-secondary transition-colors"
            >
              {habitsExpanded ? <><ChevronUp size={11} strokeWidth={1.5} /> Show less</> : <><ChevronDown size={11} strokeWidth={1.5} /> {hiddenCount} more</>}
            </button>
          )}
        </div>
      ) : (
        <div className="py-10 text-center border border-border-subtle rounded-lg">
          <p className="text-body text-text-muted mb-4">No habits set up yet.</p>
          <Link href="/chat"
            className="inline-flex items-center gap-2 text-body-sm text-champagne hover:text-champagne-soft transition-colors">
            <MessageSquarePlus size={14} strokeWidth={1.5} />
            Tell Vita your goal
          </Link>
        </div>
      )}

      {/* ── Weekly targets ───────────────────────────────────────────────── */}
      {weeklyTargets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-label tracking-widest uppercase text-text-muted font-sans font-medium">This week</p>
            <Link href="/week" className="text-caption text-text-muted hover:text-text-secondary transition-colors">
              View week
            </Link>
          </div>
          <div className="space-y-3">
            {weeklyTargets.map((wt) => (
              <div key={wt.id} className="flex items-center gap-4">
                <p className="text-body-sm text-text-secondary flex-1">{wt.label}</p>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(wt.target, 7) }).map((_, i) => (
                    <div key={i} className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
                      i < wt.done ? "bg-champagne" : "bg-border-default"
                    )} />
                  ))}
                  <span className="text-caption text-text-disabled ml-1 tabular-nums">{wt.done}/{wt.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Set goal prompt ──────────────────────────────────────────────── */}
      {!hasGoals && (
        <div className="py-10 text-center border border-border-subtle rounded-lg">
          <p className="text-body text-text-muted mb-4 max-w-xs mx-auto">
            Tell Vita what you want to achieve. She will build a plan around it.
          </p>
          <Link href="/chat"
            className="inline-flex items-center gap-2 text-body-sm text-champagne hover:text-champagne-soft transition-colors">
            <MessageSquarePlus size={14} strokeWidth={1.5} />
            Set a goal
          </Link>
        </div>
      )}

      {/* ── Talk to Vita ─────────────────────────────────────────────────── */}
      <Link
        href="/chat"
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-md border border-border-subtle bg-bg-surface hover:border-border-default transition-colors group"
      >
        <span className="text-body text-text-muted group-hover:text-text-secondary transition-colors">
          Say anything to Vita...
        </span>
        <ArrowRight size={14} strokeWidth={1.5} className="text-text-disabled group-hover:text-champagne transition-colors" />
      </Link>

    </div>
  );
}

function TodayWorkoutCard({ workout }: { workout: ScheduledWorkout }) {
  const [status, setStatus] = useState(workout.status);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [moveDate, setMoveDate] = useState("");
  const [, startTransition] = useTransition();

  if (status === "DONE" || status === "SKIPPED") return null;

  function handleComplete() {
    startTransition(async () => {
      await completeWorkout(workout.id);
      setStatus("DONE");
      toast.success("Workout logged");
    });
  }

  function handleSkip() {
    startTransition(async () => {
      await skipWorkout(workout.id);
      setStatus("SKIPPED");
    });
  }

  async function handleMove() {
    if (!moveDate) return;
    const res = await fetch(`/api/scheduled-workouts/${workout.id}/reschedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: moveDate }),
    });
    if (res.ok) {
      setStatus("MOVED");
      toast.success(`Moved to ${new Date(moveDate + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`);
    } else {
      toast.error("Could not move workout");
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const pastLimit = new Date();
  pastLimit.setDate(pastLimit.getDate() - 7);
  const minDate = pastLimit.toISOString().split("T")[0];

  return (
    <div className="rounded-md border border-border-subtle bg-bg-surface">
      <div className="flex items-start gap-4 p-4">
        <div className="w-8 h-8 rounded border border-border-default flex items-center justify-center shrink-0">
          <Dumbbell size={14} strokeWidth={1.5} className="text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-label tracking-widest uppercase text-text-muted mb-0.5">Today&apos;s workout</p>
          <p className="text-body font-medium text-text-primary">{workout.name}</p>
          <p className="text-caption text-text-muted mt-0.5">
            {workout.scheduledTime && `${workout.scheduledTime} · `}{workout.duration} min
          </p>
        </div>
      </div>

      <div className="flex gap-px border-t border-border-subtle">
        <button onClick={handleComplete}
          className="flex-1 py-2.5 text-caption text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors font-medium">
          Mark done
        </button>
        <div className="w-px bg-border-subtle" />
        <button onClick={handleSkip}
          className="px-4 py-2.5 text-caption text-text-disabled hover:text-text-muted hover:bg-bg-elevated transition-colors">
          Skip
        </button>
        <div className="w-px bg-border-subtle" />
        <button onClick={() => setShowDatePicker((v) => !v)}
          className="px-3 py-2.5 text-caption text-text-disabled hover:text-text-muted hover:bg-bg-elevated transition-colors flex items-center gap-1">
          <CalendarDays size={11} strokeWidth={1.5} />
          Move
        </button>
      </div>

      {showDatePicker && (
        <div className="p-3 border-t border-border-subtle flex items-center gap-2">
          <input
            type="date"
            defaultValue={tomorrowStr}
            min={minDate}
            onChange={(e) => setMoveDate(e.target.value)}
            className="flex-1 bg-bg-inset border border-border-default rounded px-3 py-1.5 text-caption text-text-secondary [color-scheme:dark]"
          />
          <button onClick={handleMove} disabled={!moveDate}
            className="px-3 py-1.5 rounded border border-border-default text-caption text-text-secondary hover:border-champagne/40 hover:text-champagne transition-colors disabled:opacity-40">
            Confirm
          </button>
          <button onClick={() => setShowDatePicker(false)}
            className="p-1.5 text-text-disabled hover:text-text-muted transition-colors">
            <X size={11} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
