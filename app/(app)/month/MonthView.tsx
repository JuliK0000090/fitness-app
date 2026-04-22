"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Target, TrendingDown, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type DayShade = "done" | "partial" | "rest" | "none";

interface CalendarDay {
  dateStr: string;
  dayNum: string;
  workouts: { id: string; name: string; status: string; duration: number }[];
  habitPct: number;
  shade: DayShade;
}

interface GoalSummary {
  id: string;
  title: string;
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
  monthStartDay: number; // 0=Sun
  daysInMonth: CalendarDay[];
  goals: GoalSummary[];
  heatmap: Record<string, number>;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHADE_CLASS: Record<DayShade, string> = {
  done: "bg-white/[0.08]",
  partial: "bg-white/[0.04]",
  rest: "bg-transparent",
  none: "bg-transparent",
};

function HabitRing({ pct, size = 14 }: { pct: number; size?: number }) {
  const r = (size - 2.5) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, pct / 100));
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ minWidth: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.45)" strokeWidth={1.5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

function DayDrawer({ day, onClose }: { day: CalendarDay; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-24" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-sm p-5 space-y-3 max-h-[60vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white/70">{format(new Date(day.dateStr), "EEEE, MMMM d")}</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/[0.07]">
            <X size={14} className="text-white/40" />
          </button>
        </div>
        {day.workouts.length > 0 ? (
          <div className="space-y-2">
            {day.workouts.map((w) => (
              <div key={w.id} className="flex items-center gap-2.5 py-1">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  w.status === "DONE" ? "bg-white/60" : w.status === "SKIPPED" ? "bg-white/15" : "bg-white/30"
                )} />
                <p className="text-sm text-white/65">{w.name}</p>
                <span className="text-[10px] text-white/25 ml-auto">{w.duration} min</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30">Rest day</p>
        )}
        {day.habitPct > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
            <HabitRing pct={day.habitPct} />
            <p className="text-[11px] text-white/35">{day.habitPct}% habits completed</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MonthView({ monthLabel, prevMonth, nextMonth, todayStr, monthStartDay, daysInMonth, goals, heatmap }: MonthViewProps) {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // Offset for Mon-start calendar (monthStartDay is 0=Sun)
  const offset = (monthStartDay + 6) % 7; // convert Sun=0 to Mon=0

  return (
    <div className="w-full max-w-lg mx-auto py-4 px-3 space-y-4 pb-6">

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Link href={`/month?m=${prevMonth}`} className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors">
          <ChevronLeft size={16} className="text-white/40" />
        </Link>
        <h1 className="text-base font-semibold text-white/75">{monthLabel}</h1>
        <Link href={`/month?m=${nextMonth}`} className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors">
          <ChevronRight size={16} className="text-white/40" />
        </Link>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7">
        {DOW.map((d) => (
          <p key={d} className="text-center text-[9px] text-white/20 uppercase tracking-wider py-1">{d}</p>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px">
        {/* Leading blank cells */}
        {Array.from({ length: offset }).map((_, i) => <div key={`blank-${i}`} />)}

        {daysInMonth.map((day) => {
          const isToday = day.dateStr === todayStr;
          return (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "rounded-lg p-1 flex flex-col items-center gap-0.5 aspect-square justify-center transition-colors",
                SHADE_CLASS[day.shade],
                isToday && "ring-1 ring-white/30",
                "hover:bg-white/[0.06] active:bg-white/[0.08]"
              )}
            >
              <p className={cn("text-[11px] font-medium leading-none", isToday ? "text-white/90" : "text-white/45")}>{day.dayNum}</p>
              {/* Workout dots */}
              {day.workouts.length > 0 && (
                <div className="flex gap-px justify-center flex-wrap">
                  {day.workouts.slice(0, 3).map((w, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 h-1 rounded-full",
                        w.status === "DONE" ? "bg-white/60" : w.status === "SKIPPED" ? "bg-white/10" : "bg-white/30"
                      )}
                    />
                  ))}
                </div>
              )}
              {/* Habit ring */}
              {day.habitPct > 0 && <HabitRing pct={day.habitPct} size={12} />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[9px] text-white/25 px-1 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" /> Done</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" /> Planned</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/10 shrink-0" /> Skipped</span>
      </div>

      {/* Active goals */}
      {goals.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/20 px-1">Active goals</p>
          {goals.map((g) => {
            const pct = g.targetValue != null && g.currentValue != null
              ? Math.max(0, Math.min(100, (g.currentValue / g.targetValue) * 100))
              : null;
            const onTrack = g.predictedHitDate && g.deadline
              ? new Date(g.predictedHitDate) <= new Date(g.deadline)
              : null;
            return (
              <div key={g.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                <Target size={12} className="text-white/30 shrink-0" />
                <p className="text-sm text-white/60 flex-1 truncate">{g.title}</p>
                {pct !== null && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-white/50">{Math.round(pct)}%</p>
                  </div>
                )}
                {onTrack !== null && (
                  onTrack
                    ? <TrendingUp size={11} className="text-white/40 shrink-0" />
                    : <TrendingDown size={11} className="text-white/30 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 365-day heatmap */}
      <Heatmap heatmap={heatmap} />

      {/* Day drawer */}
      {selectedDay && <DayDrawer day={selectedDay} onClose={() => setSelectedDay(null)} />}
    </div>
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

  // Pad to start on Monday
  const firstDow = (new Date(days[0].dateStr).getDay() + 6) % 7;
  const padded: ({ dateStr: string; value: number } | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...days,
  ];

  const maxVal = Math.max(...days.map((d) => d.value), 1);

  return (
    <div className="space-y-2">
      <p className="text-[9px] tracking-[0.25em] uppercase text-white/20 px-1">Past year</p>
      <div className="overflow-x-auto">
        <div
          className="grid gap-[2px]"
          style={{ gridTemplateColumns: `repeat(${Math.ceil(padded.length / 7)}, 10px)`, gridTemplateRows: "repeat(7, 10px)" }}
        >
          {padded.map((d, i) => (
            <div
              key={i}
              title={d ? `${d.dateStr}: ${d.value} actions` : ""}
              className="rounded-[2px]"
              style={{
                backgroundColor: d && d.value > 0
                  ? `rgba(255,255,255,${0.08 + (d.value / maxVal) * 0.45})`
                  : "rgba(255,255,255,0.04)",
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
