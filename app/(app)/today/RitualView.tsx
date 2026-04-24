"use client";

import { useState, useOptimistic, useTransition } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Habit = {
  id: string;
  title: string | null;
  icon: string;
  duration: number | null;
  pointsOnComplete: number;
  done: boolean;
};

type Workout = {
  id: string;
  name: string;
  scheduledTime: string | null;
  duration: number;
  status: string;
};

type WeeklyTarget = {
  id: string;
  label: string;
  icon: string;
  target: number;
  done: number;
};

type Props = {
  userName: string;
  dateLabel: string;
  currentStreak: number;
  habits: Habit[];
  scheduledWorkouts: Workout[];
  weeklyTargets: WeeklyTarget[];
  readinessScore: number | null;
  glp1Active: boolean;
};

function readinessLine(score: number | null): string {
  if (score === null) return "";
  if (score >= 71) return "Readiness is high today.";
  if (score >= 41) return "Readiness is steady.";
  return "Readiness is low — listen to your body.";
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function RitualView({
  userName,
  dateLabel,
  currentStreak,
  habits,
  scheduledWorkouts,
  weeklyTargets,
  readinessScore,
  glp1Active,
}: Props) {
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [, startTransition] = useTransition();

  const [optimisticHabits, toggleHabit] = useOptimistic(
    habits,
    (state, habitId: string) =>
      state.map((h) => h.id === habitId ? { ...h, done: !h.done } : h)
  );

  async function handleToggle(habitId: string, currentDone: boolean) {
    startTransition(async () => {
      toggleHabit(habitId);
      await fetch("/api/habits/complete", {
        method: currentDone ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId }),
      }).catch(() => {});
    });
  }

  const nextWorkout = scheduledWorkouts[0] ?? null;
  const isRestDay = scheduledWorkouts.length === 0 && habits.length === 0;

  const doneHabits = optimisticHabits.filter((h) => h.done).length;
  const totalHabits = optimisticHabits.length;
  const doneWorkouts = weeklyTargets.reduce((a, wt) => a + Math.min(wt.done, wt.target), 0);
  const totalWorkouts = weeklyTargets.reduce((a, wt) => a + wt.target, 0);

  // Build morning intro line
  const readinessText = readinessLine(readinessScore);
  const introLine = nextWorkout
    ? `${readinessText}${readinessText ? " " : ""}The ${nextWorkout.name.toLowerCase()} ${nextWorkout.scheduledTime ? `at ${formatTime(nextWorkout.scheduledTime)} ` : ""}is the centerpiece. The rest is breathing room.`
    : isRestDay
      ? "Rest is the workout today."
      : `${readinessText} ${habits.length} thing${habits.length !== 1 ? "s" : ""} on the list.`;

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="max-w-lg mx-auto px-6 pt-24 pb-20">

        {/* Date + greeting */}
        <div className="space-y-5">
          <p className="text-caption text-text-disabled uppercase tracking-widest">
            {dateLabel.toUpperCase()}
          </p>
          <h1 className="font-serif text-display-2xl font-light text-text-primary leading-tight">
            Good morning, {userName.split(" ")[0]}.
          </h1>

          {/* Champagne rule */}
          <div className="h-px w-12 bg-champagne/60" />

          {/* Intro line */}
          <p className="text-body-lg text-text-secondary leading-relaxed">
            {introLine}
          </p>
        </div>

        {/* Rest day — full empty state */}
        {isRestDay && (
          <div className="mt-24 space-y-3">
            <p className="font-serif text-display-md font-light text-text-primary">
              Rest is the workout today.
            </p>
            <p className="text-body-md text-text-muted">
              Walk if you feel like it. Drink water. Call someone you like.
            </p>
          </div>
        )}

        {/* Primary action — next workout */}
        {nextWorkout && (
          <div className="mt-16 space-y-2">
            <div className="border border-border-subtle rounded-md p-6 space-y-4 bg-bg-surface">
              <p className="text-caption text-text-disabled uppercase tracking-widest">Next</p>
              <div>
                <p className="font-serif text-display-md font-light text-text-primary">
                  {nextWorkout.name}
                </p>
                {nextWorkout.scheduledTime && (
                  <p className="text-body-md text-text-muted mt-1">
                    {formatTime(nextWorkout.scheduledTime)} · {nextWorkout.duration} min
                  </p>
                )}
              </div>
              <button
                className="w-full py-3 border border-border-default text-text-secondary text-body-sm hover:border-champagne/50 hover:text-text-primary transition-colors rounded"
                onClick={async () => {
                  await fetch("/api/scheduled-workouts/complete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: nextWorkout.id }),
                  }).catch(() => {});
                }}
              >
                Start when ready
              </button>
            </div>
          </div>
        )}

        {/* Habit quick-tiles */}
        {optimisticHabits.length > 0 && (
          <div className="mt-12 space-y-3">
            {optimisticHabits.slice(0, 4).map((habit) => (
              <button
                key={habit.id}
                onClick={() => handleToggle(habit.id, habit.done)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded border text-left transition-all",
                  habit.done
                    ? "border-champagne/30 bg-champagne/5 text-text-muted"
                    : "border-border-subtle bg-bg-surface text-text-primary hover:border-border-default"
                )}
              >
                {habit.done
                  ? <CheckCircle2 size={16} strokeWidth={1.5} className="text-champagne shrink-0" />
                  : <Circle size={16} strokeWidth={1.5} className="text-text-disabled shrink-0" />
                }
                <span className={cn("text-body-sm flex-1", habit.done && "line-through")}>
                  {habit.title}
                </span>
                {habit.duration && (
                  <span className="flex items-center gap-1 text-caption text-text-disabled">
                    <Clock size={11} strokeWidth={1.5} />
                    {habit.duration}m
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Today timeline — collapsed */}
        {scheduledWorkouts.length + habits.length > 0 && (
          <div className="mt-12 space-y-2">
            <button
              onClick={() => setTimelineOpen((o) => !o)}
              className="flex items-center justify-between w-full"
            >
              <p className="text-caption text-text-disabled uppercase tracking-widest">
                Today · {scheduledWorkouts.length + habits.length} blocks
              </p>
              <p className="text-caption text-text-disabled">{timelineOpen ? "Less" : "More"}</p>
            </button>

            {timelineOpen && (
              <div className="space-y-1.5 mt-3">
                {scheduledWorkouts.map((sw) => (
                  <div key={sw.id} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
                    <span className="text-caption text-text-disabled w-12 shrink-0">
                      {sw.scheduledTime ? formatTime(sw.scheduledTime) : "—"}
                    </span>
                    <span className="text-body-sm text-text-secondary">{sw.name}</span>
                    <span className="text-caption text-text-disabled ml-auto">{sw.duration}m</span>
                  </div>
                ))}
                {optimisticHabits.slice(4).map((h) => (
                  <div key={h.id} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
                    <span className="text-caption text-text-disabled w-12 shrink-0">habit</span>
                    <span className={cn("text-body-sm text-text-secondary flex-1", h.done && "line-through text-text-disabled")}>{h.title}</span>
                    {h.done && <CheckCircle2 size={12} className="text-champagne shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* This week — 3 numbers */}
        {weeklyTargets.length > 0 && (
          <div className="mt-12 space-y-3">
            <p className="text-caption text-text-disabled uppercase tracking-widest">This week</p>
            <div className="flex gap-8">
              <div>
                <p className="font-serif text-display-md font-light text-text-primary">
                  {doneWorkouts}
                  <span className="text-text-muted text-sm font-sans font-normal">/{totalWorkouts}</span>
                </p>
                <p className="text-caption text-text-muted">sessions</p>
              </div>
              <div>
                <p className="font-serif text-display-md font-light text-text-primary">
                  {doneHabits}
                  <span className="text-text-muted text-sm font-sans font-normal">/{totalHabits}</span>
                </p>
                <p className="text-caption text-text-muted">habits today</p>
              </div>
              {currentStreak > 0 && (
                <div>
                  <p className="font-serif text-display-md font-light text-champagne">{currentStreak}</p>
                  <p className="text-caption text-text-muted">day streak</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GLP-1 quiet note when active */}
        {glp1Active && (
          <div className="mt-8 border border-border-subtle rounded px-4 py-3">
            <p className="text-caption text-text-disabled uppercase tracking-widest mb-1">GLP-1 mode</p>
            <p className="text-body-sm text-text-muted">Muscle defense active. Strength sessions and protein goals are tracked.</p>
          </div>
        )}

        {/* Talk to Vita — ghosted */}
        <div className="mt-16 border-t border-border-subtle pt-6">
          <a
            href="/chat"
            className="block w-full text-body-sm text-text-disabled hover:text-text-muted transition-colors py-2"
          >
            Talk to Vita...
          </a>
        </div>
      </div>
    </div>
  );
}
