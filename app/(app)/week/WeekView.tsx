"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Dumbbell, CheckCircle2, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface WorkoutItem {
  id: string;
  name: string;
  status: string;
  duration: number;
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

function HabitRing({ pct, size = 20 }: { pct: number; size?: number }) {
  const r = (size - 3) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, pct / 100));
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct === 100 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)"}
        strokeWidth={2}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
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

  // Move a workout optimistically, then confirm via API
  const moveWorkout = useCallback(async (workoutId: string, fromDate: string, toDate: string) => {
    if (fromDate === toDate) return;

    // Optimistic update
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
      // Rollback
      setDays(initialDays);
      toast.error("Could not move workout — try again");
    } else {
      toast.success("Workout moved");
    }
  }, [initialDays]);

  // ── Drag handlers ────────────────────────────────────────────────────────────

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
    <div className="max-w-lg mx-auto py-4 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1">This week</p>
          <h1 className="text-lg font-semibold text-white/80">{weekLabel}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30 hover:text-white/60 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Mini 7-day strip — drop targets */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <div
            key={day.date}
            onDragOver={(e) => onDragOver(e, day.date)}
            onDrop={(e) => onDrop(e, day.date)}
            onDragLeave={() => setDragOverDate(null)}
            className={cn(
              "glass rounded-xl p-2 flex flex-col items-center gap-1 min-h-[72px] transition-all",
              day.isToday && "border border-white/20",
              dragOverDate === day.date && "border border-white/40 bg-white/[0.05]"
            )}
          >
            <p className="text-[9px] text-white/30">{day.dayLabel}</p>
            <p className={cn("text-sm font-medium", day.isToday ? "text-white/90" : "text-white/50")}>{day.dayNum}</p>
            {/* Workout dots */}
            <div className="flex flex-col gap-0.5 items-center">
              {day.workouts.slice(0, 3).map((w) => (
                <div key={w.id} className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  w.status === "DONE" ? "bg-white/60" : w.status === "SKIPPED" ? "bg-white/15" : "bg-white/30"
                )} />
              ))}
            </div>
            {day.habitPct > 0 && <HabitRing pct={day.habitPct} size={16} />}
          </div>
        ))}
      </div>

      {/* Drag hint */}
      {days.some((d) => d.workouts.filter((w) => w.status !== "DONE").length > 0) && (
        <p className="text-[10px] text-white/20 text-center">
          Drag a workout to another day to reschedule it
        </p>
      )}

      {/* Weekly targets */}
      {weeklyTargets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">Targets</p>
          {weeklyTargets.map((wt) => (
            <div key={wt.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-sm text-white/65 flex-1">{wt.label}</span>
              <div className="flex gap-1.5 items-center">
                {Array.from({ length: Math.min(wt.target, 7) }).map((_, i) => (
                  <div key={i} className={cn("w-2 h-2 rounded-full", i < wt.done ? "bg-white/55" : "bg-white/15")} />
                ))}
                <span className="text-[10px] text-white/30 ml-1">{wt.done}/{wt.target}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Day detail — draggable workout rows */}
      <div className="space-y-3">
        {days.map((day) => (
          <div
            key={day.date}
            onDragOver={(e) => onDragOver(e, day.date)}
            onDrop={(e) => onDrop(e, day.date)}
            onDragLeave={() => setDragOverDate(null)}
            className={cn(
              "glass rounded-2xl p-4 space-y-2 transition-all",
              day.isToday && "border border-white/[0.12]",
              dragOverDate === day.date && "border border-white/30 bg-white/[0.04]",
              day.workouts.length === 0 && !day.isToday && "opacity-40"
            )}
          >
            {/* Day header */}
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-white/50">
                {day.dayLabel} {day.dayNum}
              </p>
              {day.isToday && (
                <span className="text-[9px] text-white/30 uppercase tracking-wider">today</span>
              )}
              {day.workouts.length === 0 && (
                <span className="text-[10px] text-white/20 ml-auto">
                  {dragOverDate === day.date ? "Drop here" : "Rest day"}
                </span>
              )}
              {dragOverDate === day.date && day.workouts.length > 0 && (
                <span className="text-[10px] text-white/40 ml-auto">Drop to move here</span>
              )}
            </div>

            {/* Workout rows */}
            {day.workouts.map((w) => (
              <div
                key={w.id}
                draggable={w.status !== "DONE"}
                onDragStart={(e) => onDragStart(e, w.id, day.date)}
                onDragEnd={onDragEnd}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg transition-all",
                  w.status !== "DONE" && "cursor-grab active:cursor-grabbing",
                  draggingId === w.id && "opacity-40"
                )}
              >
                {/* Drag handle — only on non-done workouts */}
                {w.status !== "DONE" ? (
                  <GripVertical size={12} className="text-white/20 shrink-0 -ml-1" />
                ) : (
                  <div className="w-3 shrink-0" />
                )}

                <div className={cn(
                  "w-6 h-6 rounded-lg border flex items-center justify-center shrink-0",
                  w.status === "DONE" ? "border-white/30 bg-white/10" : "border-white/[0.07]"
                )}>
                  {w.status === "DONE"
                    ? <CheckCircle2 size={12} className="text-white/50" />
                    : <Dumbbell size={10} className="text-white/25" />
                  }
                </div>

                <p className={cn(
                  "text-sm flex-1",
                  w.status === "DONE" ? "text-white/40 line-through" :
                  w.status === "MOVED" ? "text-white/40 italic" :
                  w.status === "SKIPPED" ? "text-white/25 line-through" :
                  "text-white/70"
                )}>
                  {w.name}
                </p>
                <span className="text-[10px] text-white/25 shrink-0">{w.duration} min</span>
              </div>
            ))}

            {/* Habit progress */}
            {day.habitPct > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                <HabitRing pct={day.habitPct} size={14} />
                <p className="text-[10px] text-white/25">{day.habitPct}% habits</p>
                {day.xp > 0 && <p className="text-[10px] text-white/20 ml-auto">{day.xp} XP</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
