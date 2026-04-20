"use client";

import { Dumbbell, CheckCircle2, Zap } from "lucide-react";
import { WeeklyReviewCard } from "@/components/cards/WeeklyReviewCard";

interface DayData {
  date: string;
  dayLabel: string;
  workoutCount: number;
  checklistDone: number;
  checklistTotal: number;
  xp: number;
}

interface WeeklyReviewData {
  id: string;
  weekOf: string;
  adherencePct: number;
  workoutsCompleted: number;
  workoutsPlanned: number;
  aiVerdict: string;
}

interface WeekViewProps {
  weekLabel: string;
  days: DayData[];
  weeklyReviews: WeeklyReviewData[];
}

export function WeekView({ weekLabel, days, weeklyReviews }: WeekViewProps) {
  const totalXp = days.reduce((sum, d) => sum + d.xp, 0);
  const totalWorkouts = days.reduce((sum, d) => sum + d.workoutCount, 0);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-4">
      <div className="fu">
        <h1 className="text-lg font-bold">This Week</h1>
        <p className="text-xs text-muted-foreground">{weekLabel}</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-2 fu2">
        <div className="glass rounded-2xl p-3 text-center">
          <Dumbbell size={16} className="mx-auto mb-1 text-white/50" />
          <p className="text-xl font-bold text-white/60">{totalWorkouts}</p>
          <p className="text-[10px] text-muted-foreground">Workouts</p>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <CheckCircle2 size={16} className="mx-auto mb-1 text-white/50" />
          <p className="text-xl font-bold text-white/60">{days.reduce((s, d) => s + d.checklistDone, 0)}</p>
          <p className="text-[10px] text-muted-foreground">Tasks done</p>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <Zap size={16} className="mx-auto mb-1 text-white/50" />
          <p className="text-xl font-bold text-white/60">{totalXp}</p>
          <p className="text-[10px] text-muted-foreground">XP earned</p>
        </div>
      </div>

      {/* Day-by-day grid */}
      <div className="glass rounded-2xl p-4 fu2">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Daily breakdown</p>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const isToday = d.date === today;
            const hasActivity = d.workoutCount > 0 || d.checklistDone > 0;
            return (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <span className={`text-[9px] uppercase ${isToday ? "text-white/60 font-bold" : "text-muted-foreground"}`}>{d.dayLabel}</span>
                <div
                  className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 ${
                    isToday ? "ring-1 ring-white/[0.07]" : ""
                  } ${hasActivity ? "bg-white/[0.04]" : "bg-secondary"}`}
                >
                  {d.workoutCount > 0 && <Dumbbell size={8} className="text-white/50" />}
                  {d.checklistDone > 0 && <span className="text-[8px] text-white/60">{d.checklistDone}</span>}
                  {!hasActivity && <span className="text-[8px] text-muted-foreground/40">–</span>}
                </div>
                {d.xp > 0 && <span className="text-[8px] text-white/60">+{d.xp}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly reviews */}
      {weeklyReviews.length > 0 && (
        <div className="space-y-1 fu3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Past reviews</p>
          {weeklyReviews.map((r) => r.aiVerdict ? (
            <WeeklyReviewCard
              key={r.id}
              weekOf={r.weekOf}
              adherencePct={r.adherencePct}
              workoutsCompleted={r.workoutsCompleted}
              workoutsPlanned={r.workoutsPlanned}
              aiVerdict={r.aiVerdict}
              reviewId={r.id}
            />
          ) : null)}
        </div>
      )}
    </div>
  );
}
