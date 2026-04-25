"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Target, TrendingDown, TrendingUp, GripVertical, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

type DayShade = "done" | "partial" | "rest" | "none";

interface WorkoutItem {
  id: string;
  name: string;
  status: string;
  duration: number;
  source: string;
}

interface CalendarDay {
  dateStr: string;
  dayNum: string;
  workouts: WorkoutItem[];
  habitPct: number;
  shade: DayShade;
}

interface GoalSummary {
  id: string;
  title: string | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  predictedHitDate: string | null;
  deadline: string | null;
}

interface MonthViewProps {
  monthLabel: string;
  prevMonth: string;
  nextMonth: string;
  todayStr: string;
  monthStartDay: number;
  daysInMonth: CalendarDay[];
  goals: GoalSummary[];
  heatmap: Record<string, number>;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthView({
  monthLabel, prevMonth, nextMonth, todayStr,
  monthStartDay, daysInMonth: initialDays, goals, heatmap,
}: MonthViewProps) {
  const [days, setDays] = useState(initialDays);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragWorkout, setDragWorkout] = useState<{ id: string; fromDate: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const offset = (monthStartDay + 6) % 7;
  const selectedDay = days.find((d) => d.dateStr === selectedDate) ?? null;

  const reschedule = useCallback(async (workoutId: string, fromDate: string, toDate: string) => {
    if (fromDate === toDate) return;

    setDays((prev) => {
      let moving: WorkoutItem | undefined;
      return prev.map((d) => {
        if (d.dateStr === fromDate) {
          moving = d.workouts.find((w) => w.id === workoutId);
          return { ...d, workouts: d.workouts.filter((w) => w.id !== workoutId) };
        }
        if (d.dateStr === toDate && moving) {
          return { ...d, workouts: [...d.workouts, { ...moving, status: "MOVED" }] };
        }
        return d;
      });
    });

    if (selectedDate === fromDate) setSelectedDate(toDate);

    const res = await fetch(`/api/scheduled-workouts/${workoutId}/reschedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: toDate }),
    });

    if (!res.ok) {
      setDays(initialDays);
      toast.error("Could not move workout — try again");
    } else {
      toast.success(`Moved to ${format(new Date(toDate + "T12:00:00Z"), "MMM d")}`);
    }
  }, [initialDays, selectedDate]);

  function onWorkoutDragStart(e: React.DragEvent, workoutId: string, fromDate: string) {
    e.dataTransfer.setData("workoutId", workoutId);
    e.dataTransfer.setData("fromDate", fromDate);
    e.dataTransfer.effectAllowed = "move";
    setDragWorkout({ id: workoutId, fromDate });
  }

  function onWorkoutDragEnd() {
    setDragWorkout(null);
    setDropTarget(null);
  }

  function onCellDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(dateStr);
  }

  function onCellDrop(e: React.DragEvent, toDate: string) {
    e.preventDefault();
    const workoutId = e.dataTransfer.getData("workoutId");
    const fromDate = e.dataTransfer.getData("fromDate");
    setDragWorkout(null);
    setDropTarget(null);
    reschedule(workoutId, fromDate, toDate);
  }

  function onCellClick(day: CalendarDay) {
    if (dragWorkout) return;
    setSelectedDate((prev) => prev === day.dateStr ? null : day.dateStr);
  }

  return (
    <div className="w-full max-w-lg mx-auto py-10 px-5 space-y-8 pb-10">

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Link href={`/month?m=${prevMonth}`} className="p-1.5 rounded text-text-disabled hover:text-text-muted transition-colors">
          <ChevronLeft size={15} strokeWidth={1.5} />
        </Link>
        <div className="text-center">
          <p className="text-label tracking-widest uppercase text-champagne font-sans font-medium mb-0.5">Plan</p>
          <h1 className="font-serif text-display-sm font-light text-text-primary">{monthLabel}</h1>
        </div>
        <Link href={`/month?m=${nextMonth}`} className="p-1.5 rounded text-text-disabled hover:text-text-muted transition-colors">
          <ChevronRight size={15} strokeWidth={1.5} />
        </Link>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7">
        {DOW.map((d) => (
          <p key={d} className="text-center text-[9px] tracking-widest uppercase text-text-disabled py-1">{d}</p>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: offset }).map((_, i) => <div key={`blank-${i}`} />)}

        {days.map((day) => {
          const isToday = day.dateStr === todayStr;
          const isSelected = day.dateStr === selectedDate;
          const isDropTarget = dropTarget === day.dateStr;
          const isDragSource = dragWorkout?.fromDate === day.dateStr;

          return (
            <button
              key={day.dateStr}
              onClick={() => onCellClick(day)}
              onDragOver={(e) => onCellDragOver(e, day.dateStr)}
              onDrop={(e) => onCellDrop(e, day.dateStr)}
              onDragLeave={() => setDropTarget(null)}
              className={cn(
                "rounded p-1 flex flex-col items-center gap-0.5 aspect-square justify-center transition-all",
                isToday && "ring-1 ring-champagne/40",
                isSelected && "bg-bg-elevated ring-1 ring-border-default",
                isDropTarget && "bg-bg-elevated ring-1 ring-champagne/50 scale-[1.04]",
                isDragSource && "opacity-50",
                !isSelected && !isDropTarget && "hover:bg-bg-surface"
              )}
            >
              <p className={cn(
                "text-[11px] font-medium leading-none",
                isToday ? "text-text-primary" :
                isSelected ? "text-text-secondary" :
                "text-text-disabled"
              )}>
                {day.dayNum}
              </p>
              {day.workouts.length > 0 && (
                <div className="flex gap-px justify-center flex-wrap">
                  {day.workouts.slice(0, 3).map((w, i) => {
                    const todayForDot = new Intl.DateTimeFormat("en-CA").format(new Date());
                    const isPast = day.dateStr <= todayForDot;
                    return (
                      <div key={i} className={cn(
                        "w-1 h-1 rounded-full",
                        isPast && w.status === "DONE" ? "bg-champagne" :
                        isPast && w.status === "SKIPPED" ? "bg-border-subtle" :
                        w.source === "ai_suggested" ? "bg-border-default ring-[0.5px] ring-champagne/30" :
                        "bg-border-strong"
                      )} />
                    );
                  })}
                </div>
              )}
              {day.habitPct > 0 && <HabitArc pct={day.habitPct} />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-caption text-text-disabled flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-champagne shrink-0" /> Done</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-border-strong shrink-0" /> Planned</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-border-default ring-[0.5px] ring-champagne/30 shrink-0" /> Vita suggests</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-border-subtle shrink-0" /> Skipped</span>
      </div>

      {/* Inline day detail */}
      {selectedDay && (
        <DayDetail
          day={selectedDay}
          onClose={() => setSelectedDate(null)}
          onDragStart={onWorkoutDragStart}
          onDragEnd={onWorkoutDragEnd}
          draggingId={dragWorkout?.id ?? null}
        />
      )}

      {dragWorkout && (
        <p className="text-caption text-text-disabled text-center">
          Drop onto any day to reschedule
        </p>
      )}

      {/* Active goals */}
      <div className="space-y-3">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Active goals</p>

        {goals.length === 0 ? (
          <Link
            href={`/chat?q=${encodeURIComponent("I want to set my first goal. Ask me what you need to know — what I want to achieve, by when, and any details that matter.")}`}
            className="flex items-center gap-3 border border-dashed border-border-subtle bg-bg-surface rounded-md px-4 py-4 hover:border-border-default hover:bg-bg-elevated transition-colors group"
          >
            <Target size={12} strokeWidth={1.5} className="text-text-disabled shrink-0" />
            <div className="flex-1">
              <p className="text-body-sm text-text-disabled">No goals set yet</p>
              <p className="text-caption text-text-disabled group-hover:text-text-muted transition-colors">Talk to Vita to define your first goal →</p>
            </div>
          </Link>
        ) : (
          goals.map((g) => {
            const isUndefined = !g.title || g.title.trim() === "";
            const pct = g.targetValue != null && g.targetValue !== 0 && g.currentValue != null
              ? Math.max(0, Math.min(100, (g.currentValue / g.targetValue) * 100))
              : null;
            const onTrack = g.predictedHitDate && g.deadline
              ? new Date(g.predictedHitDate) <= new Date(g.deadline)
              : null;

            const chatUrl = isUndefined
              ? `/chat?q=${encodeURIComponent("I have a goal I haven't defined yet. Ask me everything you need — what I want to achieve, by when, and any context that matters. Help me make it specific and real.")}`
              : `/chat?q=${encodeURIComponent(`I want to talk about my goal: "${g.title}". What's the best way to make progress on it?`)}`;

            return (
              <Link
                key={g.id}
                href={chatUrl}
                className={cn(
                  "flex items-center gap-3 border rounded-md px-4 py-3 transition-colors group",
                  isUndefined
                    ? "border-dashed border-border-subtle bg-bg-surface hover:border-border-default hover:bg-bg-elevated"
                    : "border-border-subtle bg-bg-surface hover:border-border-default hover:bg-bg-elevated"
                )}
              >
                <Target size={12} strokeWidth={1.5} className={cn("shrink-0", isUndefined ? "text-text-disabled" : "text-text-muted")} />
                <div className="flex-1 min-w-0">
                  {isUndefined ? (
                    <>
                      <p className="text-body-sm text-text-disabled">Undefined goal</p>
                      <p className="text-caption text-text-disabled group-hover:text-text-muted transition-colors">Tap to define with Vita →</p>
                    </>
                  ) : (
                    <p className="text-body-sm text-text-secondary truncate">{g.title}</p>
                  )}
                </div>
                {!isUndefined && pct !== null && (
                  <p className="text-caption text-text-muted tabular-nums shrink-0">{Math.round(pct)}%</p>
                )}
                {!isUndefined && onTrack !== null && (
                  onTrack
                    ? <TrendingUp size={11} strokeWidth={1.5} className="text-sage shrink-0" />
                    : <TrendingDown size={11} strokeWidth={1.5} className="text-terracotta shrink-0" />
                )}
              </Link>
            );
          })
        )}
      </div>

      {/* 365-day heatmap */}
      <Heatmap heatmap={heatmap} />
    </div>
  );
}

function DayDetail({
  day,
  onClose,
  onDragStart,
  onDragEnd,
  draggingId,
}: {
  day: CalendarDay;
  onClose: () => void;
  onDragStart: (e: React.DragEvent, workoutId: string, fromDate: string) => void;
  onDragEnd: () => void;
  draggingId: string | null;
}) {
  const dateLabel = format(new Date(day.dateStr + "T12:00:00Z"), "EEEE, MMMM d");
  const todayStr = new Intl.DateTimeFormat("en-CA").format(new Date());
  const isPastOrToday = day.dateStr <= todayStr;

  return (
    <div className="border border-border-subtle bg-bg-surface rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <p className="text-body-sm font-medium text-text-primary">{dateLabel}</p>
        <button onClick={onClose} className="p-1 rounded hover:bg-bg-elevated transition-colors">
          <X size={13} strokeWidth={1.5} className="text-text-muted" />
        </button>
      </div>

      <div className="p-4 space-y-1">
        {day.workouts.length === 0 ? (
          <p className="text-caption text-text-disabled py-2">Rest day — no workouts scheduled.</p>
        ) : (
          day.workouts.map((w) => (
            <div
              key={w.id}
              draggable={!(isPastOrToday && w.status === "DONE")}
              onDragStart={(e) => onDragStart(e, w.id, day.dateStr)}
              onDragEnd={onDragEnd}
              className={cn(
                "flex items-center gap-2.5 py-2.5 px-2 rounded transition-all",
                !(isPastOrToday && w.status === "DONE") && "cursor-grab active:cursor-grabbing hover:bg-bg-elevated",
                draggingId === w.id && "opacity-40"
              )}
            >
              {!(isPastOrToday && w.status === "DONE") ? (
                <GripVertical size={12} strokeWidth={1.5} className="text-text-disabled shrink-0" />
              ) : (
                <div className="w-3 shrink-0" />
              )}

              <div className={cn(
                "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                isPastOrToday && w.status === "DONE" ? "border-champagne/40 bg-champagne/10" :
                w.source === "ai_suggested" ? "border-border-default" :
                "border-border-subtle"
              )}>
                {isPastOrToday && w.status === "DONE" && (
                  <Check size={10} strokeWidth={2} className="text-champagne" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-body-sm",
                  isPastOrToday && w.status === "DONE" ? "text-text-disabled line-through" :
                  isPastOrToday && w.status === "SKIPPED" ? "text-text-disabled line-through" :
                  w.status === "MOVED" ? "text-text-muted italic" :
                  w.source === "ai_suggested" ? "text-text-secondary" :
                  "text-text-primary"
                )}>
                  {w.name}
                </p>
                {w.source === "ai_suggested" && !(isPastOrToday && (w.status === "DONE" || w.status === "SKIPPED")) && (
                  <p className="text-caption text-text-disabled mt-0.5">Vita suggestion</p>
                )}
              </div>
              <span className="text-caption text-text-disabled shrink-0 tabular-nums">{w.duration} min</span>
            </div>
          ))
        )}

        {day.workouts.filter((w) => !(isPastOrToday && w.status === "DONE")).length > 0 && (
          <p className="text-caption text-text-disabled pt-1 px-2">
            Drag a workout to another day to reschedule
          </p>
        )}

        {day.habitPct > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-border-subtle px-2">
            <div className="w-16 h-px bg-border-subtle relative overflow-hidden rounded-full">
              <div className="absolute inset-y-0 left-0 bg-champagne" style={{ width: `${day.habitPct}%` }} />
            </div>
            <p className="text-caption text-text-disabled">{day.habitPct}% habits</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HabitArc({ pct }: { pct: number }) {
  const size = 12;
  const r = (size - 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, pct / 100));
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(212,196,168,0.12)" strokeWidth={1.5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(212,196,168,0.45)" strokeWidth={1.5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Heatmap({ heatmap }: { heatmap: Record<string, number> }) {
  const today = new Date();
  const days: { dateStr: string; value: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = format(d, "yyyy-MM-dd");
    days.push({ dateStr: key, value: heatmap[key] ?? 0 });
  }

  const firstDow = (new Date(days[0].dateStr).getDay() + 6) % 7;
  const padded: ({ dateStr: string; value: number } | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...days,
  ];

  const maxVal = Math.max(...days.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Past year</p>
      <div className="overflow-x-auto">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${Math.ceil(padded.length / 7)}, 10px)`,
            gridTemplateRows: "repeat(7, 10px)",
          }}
        >
          {padded.map((d, i) => (
            <div
              key={i}
              title={d ? `${d.dateStr}: ${d.value} actions` : ""}
              className="rounded-[2px]"
              style={{
                backgroundColor: d && d.value > 0
                  ? `rgba(212,196,168,${0.08 + (d.value / maxVal) * 0.55})`
                  : "rgba(31,37,48,1)",
                gridColumn: Math.floor(i / 7) + 1,
                gridRow: (i % 7) + 1,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
