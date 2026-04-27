"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Target, TrendingDown, TrendingUp, GripVertical, X, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { dayPhase, dotsForDay, ringForDay, DOT_CLASS, RING_STROKE } from "@/lib/calendar/render-rules";

interface WorkoutItem {
  id: string;
  name: string;
  status: string;
  duration: number;
  source: string;
}

interface DayHabitCompletion { status: "DONE" | "MISSED" | "SKIPPED" | "PENDING"; }

interface CalendarDay {
  dateStr: string;
  dayNum: string;
  workouts: WorkoutItem[];
  habitCompletions: DayHabitCompletion[];
  totalHabitsForDay: number;
}

interface GoalSummary {
  id: string;
  title: string | null;
  status: string;
  category: string;
  targetValue: number | null;
  startValue: number | null;
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
              {(() => {
                const phase = dayPhase(day.dateStr, todayStr);
                const dots = dotsForDay({
                  phase,
                  workouts: day.workouts.map((w) => ({ status: w.status as never, source: w.source })),
                  habitCompletions: day.habitCompletions,
                  totalHabitsForDay: day.totalHabitsForDay,
                });
                const ring = ringForDay({
                  phase,
                  workouts: day.workouts.map((w) => ({ status: w.status as never, source: w.source })),
                  habitCompletions: day.habitCompletions,
                  totalHabitsForDay: day.totalHabitsForDay,
                });
                return (
                  <>
                    {dots.length > 0 && (
                      <div className="flex gap-px justify-center flex-wrap">
                        {dots.slice(0, 3).map((dot, i) => (
                          <div key={i} className={cn("w-1 h-1 rounded-full", DOT_CLASS[dot.color])} />
                        ))}
                      </div>
                    )}
                    {ring.show && <HabitArc fillRatio={ring.fillRatio} stroke={RING_STROKE[ring.color]} />}
                  </>
                );
              })()}
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

      {/* Goals — same source as /goals page */}
      <GoalsSection goals={goals} />

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

        {(() => {
          if (day.totalHabitsForDay === 0) return null;
          const done = day.habitCompletions.filter((c) => c.status === "DONE").length;
          const pct = Math.min(100, Math.round((done / day.totalHabitsForDay) * 100));
          if (pct === 0 && !isPastOrToday) return null;
          return (
            <div className="flex items-center gap-2 pt-2 border-t border-border-subtle px-2">
              <div className="w-16 h-px bg-border-subtle relative overflow-hidden rounded-full">
                <div className="absolute inset-y-0 left-0 bg-champagne" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-caption text-text-disabled">{pct}% habits</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function GoalProgressRing({ pct, size = 36 }: { pct: number; size?: number }) {
  const stroke = 2.5;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, Math.max(0, pct / 100)));
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(212,196,168,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(212,196,168,0.7)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
}

function GoalsSection({ goals }: { goals: GoalSummary[] }) {
  // Hide goals without a title — they're noise on the plan view.
  // The /goals page is where users define them.
  const named = goals.filter((g) => g.title && g.title.trim() !== "");
  const active = named.filter((g) => g.status === "active" || g.status === "paused");
  const achieved = named.filter((g) => g.status === "achieved");

  if (named.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Your goals</p>
        <Link
          href={`/chat?q=${encodeURIComponent("I want to set my first goal. Ask me what you need to know — what I want to achieve, by when, and any details that matter.")}`}
          className="relative flex items-center gap-3 border border-dashed border-border-subtle bg-bg-surface rounded-md px-4 py-4 hover:border-champagne/40 hover:bg-bg-elevated transition-all duration-300 group overflow-hidden"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(212,196,168,0.06) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2.4s ease-in-out infinite",
            }}
          />
          <Sparkles size={13} strokeWidth={1.5} className="text-champagne/70 shrink-0 relative" />
          <div className="flex-1 relative">
            <p className="text-body-sm text-text-secondary">Set your first goal</p>
            <p className="text-caption text-text-disabled group-hover:text-text-muted transition-colors">Tap — Vita will ask you everything she needs →</p>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Your goals</p>
        <Link href="/goals" className="text-caption text-text-disabled hover:text-text-muted transition-colors">
          View all →
        </Link>
      </div>

      <div className="space-y-2">
        {active.map((g) => <GoalRow key={g.id} g={g} />)}
        {achieved.length > 0 && (
          <>
            <p className="text-[9px] tracking-widest uppercase text-text-disabled pt-2">Achieved</p>
            {achieved.map((g) => <GoalRow key={g.id} g={g} dimmed />)}
          </>
        )}
      </div>
    </div>
  );
}

function GoalRow({ g, dimmed = false }: { g: GoalSummary; dimmed?: boolean }) {
  const isUndefined = !g.title || g.title.trim() === "";

  const rangeSize = g.targetValue != null && g.startValue != null
    ? Math.abs(g.targetValue - g.startValue)
    : 0;
  const pct = !isUndefined && rangeSize > 0 && g.currentValue != null && g.startValue != null
    ? Math.max(0, Math.min(100, Math.abs((g.currentValue - g.startValue) / rangeSize) * 100))
    : null;

  const onTrack = g.predictedHitDate && g.deadline
    ? new Date(g.predictedHitDate) <= new Date(g.deadline)
    : null;

  const chatUrl = isUndefined
    ? `/chat?q=${encodeURIComponent("I have a goal I haven't defined yet. Ask me everything you need — what I want to achieve, by when, and any context that matters. Help me make it specific and real.")}`
    : `/chat?q=${encodeURIComponent(`I want to talk about my goal: "${g.title}". What's the best way to make progress on it?`)}`;

  const isAchieved = g.status === "achieved";
  const isComplete = pct !== null && pct >= 100;

  return (
    <Link
      href={chatUrl}
      className={cn(
        "relative flex items-center gap-3 border rounded-md px-4 py-3 transition-all duration-300 group overflow-hidden",
        isUndefined
          ? "border-dashed border-border-subtle bg-bg-surface hover:border-champagne/40"
          : "border-border-subtle bg-bg-surface hover:border-champagne/40",
        dimmed && "opacity-60",
        "hover:bg-bg-elevated hover:translate-y-[-1px]"
      )}
    >
      {/* Shimmer tease on hover for live goals */}
      {!isUndefined && !dimmed && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(212,196,168,0.05) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2.4s ease-in-out infinite",
          }}
        />
      )}

      {/* Celebration burst when at/over 100% */}
      {isComplete && !isAchieved && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(circle at 30% 50%, rgba(212,196,168,0.10), transparent 60%)",
            animation: "pulse 3s ease-in-out infinite",
          }}
        />
      )}

      {pct !== null ? (
        <div className="relative shrink-0">
          <GoalProgressRing pct={pct} size={36} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] tabular-nums text-text-muted">
            {Math.round(pct)}
          </span>
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full border border-dashed border-border-subtle flex items-center justify-center shrink-0">
          <Target size={12} strokeWidth={1.5} className="text-text-disabled" />
        </div>
      )}

      <div className="flex-1 min-w-0 relative">
        {isUndefined ? (
          <>
            <p className="text-body-sm text-text-disabled">Undefined goal</p>
            <p className="text-caption text-text-disabled group-hover:text-text-muted transition-colors">Tap to define with Vita →</p>
          </>
        ) : (
          <>
            <p className={cn("text-body-sm truncate", isAchieved ? "text-text-disabled" : "text-text-secondary")}>
              {g.title}
            </p>
            <p className="text-caption text-text-disabled truncate">
              {isAchieved
                ? "Achieved"
                : g.deadline
                  ? `By ${format(new Date(g.deadline), "MMM d")}`
                  : "Talk to Vita to plan it →"}
            </p>
          </>
        )}
      </div>

      {!isUndefined && !isAchieved && onTrack !== null && (
        onTrack
          ? <TrendingUp size={11} strokeWidth={1.5} className="text-sage shrink-0 relative" />
          : <TrendingDown size={11} strokeWidth={1.5} className="text-terracotta shrink-0 relative" />
      )}
    </Link>
  );
}

function HabitArc({ fillRatio, stroke }: { fillRatio: number; stroke: string }) {
  const size = 12;
  const r = (size - 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, Math.max(0, fillRatio)));
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(212,196,168,0.12)" strokeWidth={1.5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        className={stroke}
        strokeWidth={1.5}
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
