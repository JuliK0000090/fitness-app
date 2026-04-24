"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface WorkoutItem {
  id: string;
  name: string;
  status: string;
  duration: number;
  source: string;
}

interface DayData {
  date: string;
  dayLabel: string;
  dayNum: string;
  isToday: boolean;
  workouts: WorkoutItem[];
  habitPct: number;
  xp: number;
}

interface WeeklyTarget {
  id: string;
  label: string;
  icon: string;
  target: number;
  done: number;
}

interface WeekViewProps {
  weekLabel: string;
  days: DayData[];
  weeklyTargets: WeeklyTarget[];
}

async function rescheduleWorkout(workoutId: string, newDate: string): Promise<boolean> {
  const res = await fetch(`/api/scheduled-workouts/${workoutId}/reschedule`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: newDate }),
  });
  return res.ok;
}

export function WeekView({ weekLabel, days: initialDays, weeklyTargets }: WeekViewProps) {
  const [days, setDays] = useState(initialDays);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const moveWorkout = useCallback(async (workoutId: string, fromDate: string, toDate: string) => {
    if (fromDate === toDate) return;

    setDays((prev) =>
      prev.map((day) => {
        if (day.date === fromDate) {
          return { ...day, workouts: day.workouts.filter((w) => w.id !== workoutId) };
        }
        if (day.date === toDate) {
          const workout = prev
            .find((d) => d.date === fromDate)
            ?.workouts.find((w) => w.id === workoutId);
          if (!workout) return day;
          return { ...day, workouts: [...day.workouts, { ...workout, status: "MOVED" }] };
        }
        return day;
      })
    );

    const ok = await rescheduleWorkout(workoutId, toDate);
    if (!ok) {
      setDays(initialDays);
      toast.error("Could not move workout — try again");
    } else {
      toast.success("Workout moved");
    }
  }, [initialDays]);

  function onDragStart(e: React.DragEvent, workoutId: string, fromDate: string) {
    e.dataTransfer.setData("workoutId", workoutId);
    e.dataTransfer.setData("fromDate", fromDate);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(workoutId);
  }

  function onDragEnd() {
    setDraggingId(null);
    setDragOverDate(null);
  }

  function onDragOver(e: React.DragEvent, toDate: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(toDate);
  }

  function onDrop(e: React.DragEvent, toDate: string) {
    e.preventDefault();
    const workoutId = e.dataTransfer.getData("workoutId");
    const fromDate = e.dataTransfer.getData("fromDate");
    setDraggingId(null);
    setDragOverDate(null);
    moveWorkout(workoutId, fromDate, toDate);
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-5 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-label tracking-widest uppercase text-champagne font-sans font-medium mb-1">This week</p>
          <h1 className="font-serif text-display-sm font-light text-text-primary">{weekLabel}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded text-text-disabled hover:text-text-muted transition-colors">
            <ChevronLeft size={14} strokeWidth={1.5} />
          </button>
          <button className="p-1.5 rounded text-text-disabled hover:text-text-muted transition-colors">
            <ChevronRight size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 7-day strip — drop targets */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <div
            key={day.date}
            onDragOver={(e) => onDragOver(e, day.date)}
            onDrop={(e) => onDrop(e, day.date)}
            onDragLeave={() => setDragOverDate(null)}
            className={cn(
              "border rounded-md p-2 flex flex-col items-center gap-1 min-h-[72px] transition-all",
              day.isToday
                ? "border-border-default bg-bg-elevated"
                : "border-border-subtle bg-bg-surface",
              dragOverDate === day.date && "border-champagne/50 bg-bg-elevated"
            )}
          >
            <p className="text-[9px] tracking-widest uppercase text-text-disabled">{day.dayLabel}</p>
            <p className={cn(
              "text-sm font-medium",
              day.isToday ? "text-text-primary" : "text-text-muted"
            )}>
              {day.dayNum}
            </p>
            <div className="flex flex-col gap-0.5 items-center">
              {day.workouts.slice(0, 3).map((w) => (
                <div key={w.id} className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  w.status === "DONE" ? "bg-champagne" :
                  w.status === "SKIPPED" ? "bg-border-subtle" :
                  "bg-border-default"
                )} />
              ))}
            </div>
            {day.habitPct > 0 && (
              <HabitArc pct={day.habitPct} />
            )}
          </div>
        ))}
      </div>

      {/* Drag hint */}
      {days.some((d) => d.workouts.filter((w) => w.status !== "DONE").length > 0) && (
        <p className="text-caption text-text-disabled text-center">
          Drag a workout to another day to reschedule
        </p>
      )}

      {/* Weekly targets */}
      {weeklyTargets.length > 0 && (
        <div className="space-y-3">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Targets</p>
          {weeklyTargets.map((wt) => (
            <div key={wt.id} className="border border-border-subtle bg-bg-surface rounded-md px-4 py-3 flex items-center gap-3">
              <span className="text-body-sm text-text-secondary flex-1">{wt.label}</span>
              <div className="flex gap-1.5 items-center">
                {Array.from({ length: Math.min(wt.target, 7) }).map((_, i) => (
                  <div key={i} className={cn(
                    "w-2 h-2 rounded-full",
                    i < wt.done ? "bg-champagne" : "bg-border-default"
                  )} />
                ))}
                <span className="text-caption text-text-disabled ml-1 tabular-nums">{wt.done}/{wt.target}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Day detail rows */}
      <div className="space-y-3">
        {days.map((day) => (
          <div
            key={day.date}
            onDragOver={(e) => onDragOver(e, day.date)}
            onDrop={(e) => onDrop(e, day.date)}
            onDragLeave={() => setDragOverDate(null)}
            className={cn(
              "border rounded-md p-4 space-y-2 transition-all",
              day.isToday ? "border-border-default bg-bg-elevated" : "border-border-subtle bg-bg-surface",
              dragOverDate === day.date && "border-champagne/40",
              day.workouts.length === 0 && !day.isToday && "opacity-40"
            )}
          >
            <div className="flex items-center gap-2">
              <p className="text-body-sm text-text-muted">
                {day.dayLabel} {day.dayNum}
              </p>
              {day.isToday && (
                <span className="text-label text-champagne uppercase tracking-widest">today</span>
              )}
              {day.workouts.length === 0 && (
                <span className="text-caption text-text-disabled ml-auto">
                  {dragOverDate === day.date ? "Drop here" : "Rest day"}
                </span>
              )}
              {dragOverDate === day.date && day.workouts.length > 0 && (
                <span className="text-caption text-text-muted ml-auto">Drop to move here</span>
              )}
            </div>

            {day.workouts.map((w) => {
              const todayStr = new Intl.DateTimeFormat("en-CA").format(new Date());
              const isPastOrToday = day.date <= todayStr;
              const isDone = isPastOrToday && w.status === "DONE";
              const isSkipped = isPastOrToday && w.status === "SKIPPED";
              const isAiSuggested = w.source === "ai_suggested";

              return (
                <div
                  key={w.id}
                  draggable={!isDone}
                  onDragStart={(e) => onDragStart(e, w.id, day.date)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    "flex items-center gap-2.5 rounded transition-all",
                    !isDone && "cursor-grab active:cursor-grabbing",
                    draggingId === w.id && "opacity-40"
                  )}
                >
                  {!isDone ? (
                    <GripVertical size={12} strokeWidth={1.5} className="text-text-disabled shrink-0 -ml-1" />
                  ) : (
                    <div className="w-3 shrink-0" />
                  )}

                  <div className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                    isDone ? "border-champagne/40 bg-champagne/10" :
                    isAiSuggested ? "border-border-default" :
                    "border-border-subtle"
                  )}>
                    {isDone && <Check size={10} strokeWidth={2} className="text-champagne" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-body-sm",
                      isDone ? "text-text-disabled line-through" :
                      isSkipped ? "text-text-disabled line-through" :
                      w.status === "MOVED" ? "text-text-muted italic" :
                      isAiSuggested ? "text-text-secondary" :
                      "text-text-primary"
                    )}>
                      {w.name}
                    </p>
                    {isAiSuggested && !isDone && !isSkipped && (
                      <p className="text-caption text-text-disabled mt-0.5">Vita suggestion</p>
                    )}
                  </div>
                  <span className="text-caption text-text-disabled shrink-0 tabular-nums">{w.duration} min</span>
                </div>
              );
            })}

            {day.habitPct > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                <div className="w-20 h-px bg-border-subtle relative overflow-hidden rounded-full">
                  <div
                    className="absolute inset-y-0 left-0 bg-champagne"
                    style={{ width: `${day.habitPct}%` }}
                  />
                </div>
                <p className="text-caption text-text-disabled">{day.habitPct}% habits</p>
                {day.xp > 0 && <p className="text-caption text-text-disabled ml-auto tabular-nums">{day.xp} XP</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HabitArc({ pct }: { pct: number }) {
  const size = 16;
  const r = (size - 3) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, pct / 100));
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(212,196,168,0.12)" strokeWidth={1.5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct === 100 ? "rgba(212,196,168,0.7)" : "rgba(212,196,168,0.35)"}
        strokeWidth={1.5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}
