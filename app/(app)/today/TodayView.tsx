"use client";

import { useState, useTransition, useOptimistic } from "react";
import Link from "next/link";
import { Bell, X, MessageSquarePlus, Flame, CheckCircle2, Circle, Clock, Dumbbell, Activity, Footprints, Droplets, Wind, Zap, Sun, Moon, Beef, Heart, Camera, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { completeHabit, uncompleteHabit, completeWorkout, skipWorkout } from "@/app/actions/habits";
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
  title: string;
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

export function TodayView({
  userName, dateLabel, level, totalXp, xpToNext, xpPct, currentStreak,
  habits: initHabits, scheduledWorkouts: initWorkouts, weeklyTargets,
  notifications: initNotifications, hasGoals,
}: TodayViewProps) {
  const [notifications, setNotifications] = useState(initNotifications);
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

  return (
    <div className="max-w-lg mx-auto py-6 px-5 space-y-5">

      {/* Header */}
      <div className="fu">
        <p className="text-[10px] tracking-[0.25em] uppercase text-white/30 mb-1">{dateLabel}</p>
        <p className="text-sm text-white/45">{greeting},</p>
        <h1 className="font-cormorant text-4xl font-light text-white/90 mt-0.5">{userName}</h1>
      </div>

      {/* XP bar */}
      <div className="glass rounded-2xl p-4 fu2">
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
        <div key={n.id} className="glass rounded-2xl p-4 flex gap-3 fu border border-white/[0.07]">
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

      {/* Today's workout */}
      {initWorkouts.map((sw) => (
        <TodayWorkoutCard key={sw.id} workout={sw} />
      ))}

      {/* Habit checklist */}
      {totalCount > 0 ? (
        <div className="glass rounded-2xl overflow-hidden fu2">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Daily habits</p>
            <span className="text-[10px] text-white/30">{doneCount} / {totalCount}</span>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {optimisticHabits.map((habit) => (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  "hover:bg-white/[0.03] active:bg-white/[0.05]",
                  habit.done && "opacity-50"
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
                  <p className={cn("text-sm", habit.done && "line-through text-white/40")}>{habit.title}</p>
                  {habit.duration && !habit.done && (
                    <p className="text-[10px] text-white/25 mt-0.5">{habit.duration} min</p>
                  )}
                </div>
                <span className="text-[10px] text-white/20 shrink-0">+{habit.pointsOnComplete}</span>
              </button>
            ))}
          </div>
          <div className="px-4 pb-3 pt-1">
            <div className="h-px bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-white/30 transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 text-center fu2">
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
        <div className="fu2">
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 px-1 mb-2">This week</p>
          <div className="flex flex-wrap gap-2">
            {weeklyTargets.map((wt) => (
              <div key={wt.id} className="glass rounded-xl px-3 py-2 flex items-center gap-2">
                <Icon name={wt.icon} size={11} className="text-white/35" />
                <span className="text-[11px] text-white/55">{wt.label}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: wt.target }).map((_, i) => (
                    <div
                      key={i}
                      className={cn("w-1.5 h-1.5 rounded-full", i < wt.done ? "bg-white/50" : "bg-white/15")}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-white/30">{wt.done}/{wt.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Set goal prompt if no goals */}
      {!hasGoals && (
        <div className="glass rounded-2xl p-5 text-center fu3 border border-white/[0.06]">
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

      {/* CTA */}
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
  const [, startTransition] = useTransition();

  if (status === "DONE" || status === "SKIPPED") return null;

  function handleComplete() {
    startTransition(async () => {
      await completeWorkout(workout.id);
      setStatus("DONE");
      toast.success(`Workout logged. +50 XP`);
    });
  }

  function handleSkip() {
    startTransition(async () => {
      await skipWorkout(workout.id);
      setStatus("SKIPPED");
    });
  }

  return (
    <div className="glass rounded-2xl p-4 fu border border-white/[0.07]">
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
        <Link
          href="/chat"
          className="px-4 py-2 rounded-xl bg-white/[0.03] text-xs text-white/30 hover:bg-white/[0.06] transition-colors"
        >
          Move
        </Link>
      </div>
    </div>
  );
}
