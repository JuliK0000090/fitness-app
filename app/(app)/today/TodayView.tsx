"use client";

import { useState, useTransition, useOptimistic } from "react";
import Link from "next/link";
import { Bell, X, MessageSquarePlus, Flame, CheckCircle2, Circle, Clock, Dumbbell, Activity, Footprints, Droplets, Wind, Zap, Sun, Moon, Beef, Heart, Camera, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { completeHabit, uncompleteHabit, completeWorkout, skipWorkout, deleteHabit } from "@/app/actions/habits";
import { TodaySignals } from "@/components/health/TodaySignals";

// Map lucide icon name string → component
const ICON_MAP: Record<string, React.ElementType> = {
  CheckCircle: CheckCircle2, CheckCircle2, Circle, Footprints, Droplets, Wind, Zap, Sun, Moon,
  Beef, Heart, Camera, Dumbbell, Activity, Flame, Clock,
};
function Icon({ name, size = 14, className }: { name: string; size?: number; className?: string }) {
  const Comp = ICON_MAP[name] ?? CheckCircle2;
  return <Comp size={size} className={className} />;
}

interface Habit {
  id: string;
  title: string | null;
  icon: string;
  duration: number | null;
  pointsOnComplete: number;
  done: boolean;
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
}

const HABITS_VISIBLE_DEFAULT = 5;

export function TodayView({
  userName, dateLabel, level, totalXp, xpToNext, xpPct, currentStreak,
  habits: initHabits, scheduledWorkouts: initWorkouts, weeklyTargets,
  notifications: initNotifications, hasGoals,
}: TodayViewProps) {
  const [notifications, setNotifications] = useState(initNotifications);
  const [editMode, setEditMode] = useState(false);
  const [habitsExpanded, setHabitsExpanded] = useState(false);
  const [, startTransition] = useTransition();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  // Optimistic habit state
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
        toast.success(`+${habit.pointsOnComplete} XP`);
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
    <div className="max-w-lg mx-auto py-6 px-5 space-y-5">

      {/* Header */}
      <div>
        <p className="text-[10px] tracking-[0.25em] uppercase text-white/30 mb-1">{dateLabel}</p>
        <p className="text-sm text-white/45">{greeting},</p>
        <h1 className="font-cormorant text-4xl font-light text-white/90 mt-0.5">{userName}</h1>
      </div>

      {/* XP bar */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="font-cormorant text-2xl font-light text-white/85">Level {level}</span>
            {currentStreak > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-white/35">
                <Flame size={10} className="text-white/30" />
                {currentStreak} day streak
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-wide text-white/30">{totalXp} XP · {xpToNext} to next</span>
        </div>
        <div className="h-px w-full bg-white/[0.08] overflow-hidden rounded-full">
          <div className="h-full bg-white/50 transition-all duration-700" style={{ width: `${xpPct}%` }} />
        </div>
      </div>

      {/* Health signals */}
      <TodaySignals />

      {/* Notifications */}
      {notifications.map((n) => (
        <div key={n.id} className="glass rounded-2xl p-4 flex gap-3 border border-white/[0.07]">
          <Bell size={13} className="text-white/40 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/70">{n.title}</p>
            <p className="text-xs text-white/35 line-clamp-2 mt-0.5">{n.body}</p>
          </div>
          <button onClick={() => dismissNotification(n.id)} className="p-1 rounded hover:bg-secondary shrink-0">
            <X size={11} className="text-white/30" />
          </button>
        </div>
      ))}

      {/* Today's workouts */}
      {initWorkouts.map((sw) => (
        <TodayWorkoutCard key={sw.id} workout={sw} />
      ))}

      {/* Habit checklist */}
      {totalCount > 0 ? (
        <div className="glass rounded-2xl overflow-hidden">
          {/* Section header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-baseline gap-2">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Daily habits</p>
              <span className="text-[10px] text-white/30">{doneCount} / {totalCount}</span>
            </div>
            <button
              onClick={() => setEditMode((v) => !v)}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              {editMode ? "Done" : "Edit"}
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-4 pb-2">
            <div className="h-px bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-white/30 transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Habit rows */}
          <div className="divide-y divide-white/[0.05]">
            {visibleHabits.map((habit) => (
              <div key={habit.id} className="flex items-center">
                {editMode && (
                  <button
                    onClick={() => startTransition(async () => { await deleteHabit(habit.id); })}
                    className="pl-4 pr-2 py-3 text-red-400/60 hover:text-red-400 transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  onClick={() => !editMode && toggleHabit(habit)}
                  className={cn(
                    "flex-1 flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    !editMode && "hover:bg-white/[0.03] active:bg-white/[0.05]",
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                    habit.done ? "border-white/40 bg-white/10" : "border-white/20"
                  )}>
                    {habit.done && <CheckCircle2 size={12} className="text-white/60" />}
                  </div>
                  <Icon name={habit.icon} size={13} className="text-white/35 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm",
                      habit.done ? "line-through text-white/30" : "text-white/75"
                    )}>{habit.title ?? "Habit"}</p>
                    {habit.duration && !habit.done && (
                      <p className="text-[10px] text-white/25 mt-0.5">{habit.duration} min</p>
                    )}
                  </div>
                  {!editMode && (
                    <span className="text-[10px] text-white/20 shrink-0">+{habit.pointsOnComplete}</span>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Show more / less toggle */}
          {totalCount > HABITS_VISIBLE_DEFAULT && (
            <button
              onClick={() => setHabitsExpanded((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-white/30 hover:text-white/55 transition-colors border-t border-white/[0.05]"
            >
              {habitsExpanded ? (
                <><ChevronUp size={11} /> Show less</>
              ) : (
                <><ChevronDown size={11} /> {hiddenCount} more habit{hiddenCount !== 1 ? "s" : ""}</>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-white/30 mb-3">No habits set up yet.</p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/50 hover:bg-white/[0.07] transition-colors"
          >
            <MessageSquarePlus size={12} />
            Tell Vita your goal
          </Link>
        </div>
      )}

      {/* Weekly targets */}
      {weeklyTargets.length > 0 && (
        <div>
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 px-1 mb-2">This week</p>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
            {weeklyTargets.map((wt) => (
              <div key={wt.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm text-white/60 flex-1">{wt.label}</span>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(wt.target, 7) }).map((_, i) => (
                    <div
                      key={i}
                      className={cn("w-2 h-2 rounded-full", i < wt.done ? "bg-white/55" : "bg-white/15")}
                    />
                  ))}
                  <span className="text-[10px] text-white/30 ml-1 tabular-nums">{wt.done}/{wt.target}</span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/week" className="block text-[10px] text-white/20 hover:text-white/40 transition-colors text-right mt-1.5 pr-1">
            View full week →
          </Link>
        </div>
      )}

      {/* Set goal prompt */}
      {!hasGoals && (
        <div className="glass rounded-2xl p-5 text-center border border-white/[0.06]">
          <p className="text-sm text-white/40 mb-3">Tell Vita what you want to achieve — she will build your full plan.</p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-white/[0.05] text-white/60 hover:bg-white/[0.09] transition-colors"
          >
            <MessageSquarePlus size={14} />
            Set my goal
          </Link>
        </div>
      )}

      {/* Talk to Vita CTA */}
      <div className="pb-6">
        <Link
          href="/chat"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/[0.09] text-sm text-white/40 hover:border-white/20 hover:text-white/65 transition-all"
        >
          <MessageSquarePlus size={15} />
          Talk to Vita
        </Link>
      </div>

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
      toast.success("Workout logged. +50 XP");
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

  // Default move date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Min date for past moves = 7 days ago
  const pastLimit = new Date();
  pastLimit.setDate(pastLimit.getDate() - 7);
  const minDate = pastLimit.toISOString().split("T")[0];

  return (
    <div className="glass rounded-2xl p-4 border border-white/[0.07]">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl border border-white/[0.07] flex items-center justify-center shrink-0">
          <Dumbbell size={15} className="text-white/40" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] tracking-widest uppercase text-white/25 mb-0.5">Today&apos;s workout</p>
          <p className="text-sm font-medium text-white/80">{workout.name}</p>
          <p className="text-xs text-white/35 mt-0.5">
            {workout.scheduledTime && `${workout.scheduledTime} · `}{workout.duration} min · +50 XP on complete
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleComplete}
          className="flex-1 py-2 rounded-xl bg-white/[0.07] text-xs text-white/65 hover:bg-white/[0.11] transition-colors font-medium"
        >
          Done
        </button>
        <button
          onClick={handleSkip}
          className="px-4 py-2 rounded-xl bg-white/[0.03] text-xs text-white/30 hover:bg-white/[0.06] transition-colors"
        >
          Skip
        </button>
        <button
          onClick={() => setShowDatePicker((v) => !v)}
          className="px-3 py-2 rounded-xl bg-white/[0.03] text-xs text-white/30 hover:bg-white/[0.06] transition-colors flex items-center gap-1"
        >
          <CalendarDays size={11} />
          Move
        </button>
      </div>

      {/* Date picker to move workout */}
      {showDatePicker && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
          <input
            type="date"
            defaultValue={tomorrowStr}
            min={minDate}
            onChange={(e) => setMoveDate(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/60 [color-scheme:dark]"
          />
          <button
            onClick={handleMove}
            disabled={!moveDate}
            className="px-4 py-1.5 rounded-lg bg-white/[0.07] text-xs text-white/65 hover:bg-white/[0.11] transition-colors disabled:opacity-40"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowDatePicker(false)}
            className="p-1.5 rounded-lg text-white/25 hover:text-white/50 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
