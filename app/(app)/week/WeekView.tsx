"use client";

import { cn } from "@/lib/utils";
import { Dumbbell, CheckCircle2 } from "lucide-react";

interface DayData {
  date: string;
  dayLabel: string;
  dayNum: string;
  isToday: boolean;
  workouts: { id: string; name: string; status: string; duration: number }[];
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
    <svg width={size} height={size} className="-rotate-90">
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

export function WeekView({ weekLabel, days, weeklyTargets }: WeekViewProps) {
  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-5">
      <div>
        <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1">This week</p>
        <h1 className="text-lg font-bold text-white/80">{weekLabel}</h1>
      </div>

      {/* Weekly targets */}
      {weeklyTargets.length > 0 && (
        <div className="space-y-2">
          {weeklyTargets.map((wt) => (
            <div key={wt.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-sm text-white/65 flex-1">{wt.label}</span>
              <div className="flex gap-1.5 items-center">
                {Array.from({ length: wt.target }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      i < wt.done ? "bg-white/55" : "bg-white/15"
                    )}
                  />
                ))}
                <span className="text-[10px] text-white/30 ml-1">{wt.done}/{wt.target}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Day cards */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const done = day.workouts.filter((w) => w.status === "DONE").length;
          const total = day.workouts.length;
          return (
            <div
              key={day.date}
              className={cn(
                "glass rounded-2xl p-2 flex flex-col items-center gap-1.5 min-h-[90px]",
                day.isToday && "border border-white/20"
              )}
            >
              <p className="text-[9px] text-white/30">{day.dayLabel}</p>
              <p className={cn("text-sm font-medium", day.isToday ? "text-white/90" : "text-white/50")}>{day.dayNum}</p>

              {/* Workout dots */}
              <div className="flex flex-col gap-0.5 w-full items-center">
                {day.workouts.slice(0, 3).map((w) => (
                  <div
                    key={w.id}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      w.status === "DONE" ? "bg-white/60" : w.status === "SKIPPED" ? "bg-white/15" : "bg-white/30"
                    )}
                  />
                ))}
              </div>

              {/* Habit ring */}
              {day.habitPct > 0 && <HabitRing pct={day.habitPct} />}

              {/* XP */}
              {day.xp > 0 && (
                <p className="text-[8px] text-white/20">{day.xp}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Day detail — expanded list below grid */}
      <div className="space-y-3">
        {days.filter((d) => d.workouts.length > 0).map((day) => (
          <div key={day.date} className={cn("glass rounded-2xl p-4 space-y-2", day.isToday && "border border-white/[0.12]")}>
            <p className="text-xs font-medium text-white/50">
              {day.dayLabel} {day.dayNum}
              {day.isToday && <span className="ml-2 text-[9px] text-white/30 uppercase tracking-wider">today</span>}
            </p>
            {day.workouts.map((w) => (
              <div key={w.id} className="flex items-center gap-2.5">
                <div className={cn(
                  "w-6 h-6 rounded-lg border flex items-center justify-center shrink-0",
                  w.status === "DONE" ? "border-white/30 bg-white/10" : "border-white/[0.07]"
                )}>
                  {w.status === "DONE"
                    ? <CheckCircle2 size={12} className="text-white/50" />
                    : <Dumbbell size={10} className="text-white/25" />
                  }
                </div>
                <p className={cn("text-sm", w.status === "DONE" ? "text-white/50 line-through" : "text-white/70")}>
                  {w.name}
                </p>
                <span className="text-[10px] text-white/25 ml-auto">{w.duration} min</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-0.5">
              <HabitRing pct={day.habitPct} size={16} />
              <p className="text-[10px] text-white/25">{day.habitPct}% habits done · {day.xp} XP</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
