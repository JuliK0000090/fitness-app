"use client";

import { useState } from "react";
import { BarChart2, CheckCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface WeeklyReviewCardProps {
  weekOf: string;
  adherencePct: number;
  workoutsCompleted: number;
  workoutsPlanned: number;
  aiVerdict: string;
  suggestions?: string[];
  reviewId?: string;
}

export function WeeklyReviewCard({
  weekOf,
  adherencePct,
  workoutsCompleted,
  workoutsPlanned,
  aiVerdict,
  suggestions = [],
  reviewId,
}: WeeklyReviewCardProps) {
  const [accepted, setAccepted] = useState(false);

  async function accept() {
    if (reviewId) {
      await fetch(`/api/weekly-review/${reviewId}/accept`, { method: "POST" });
    }
    setAccepted(true);
    toast.success("Plan accepted for next week!");
  }

  const pct = Math.round(adherencePct);

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-white/[0.07]">
      <div className="flex items-center gap-2">
        <div className="border border-white/[0.07] w-8 h-8 rounded-xl flex items-center justify-center">
          <BarChart2 size={16} className="text-white/50" />
        </div>
        <div>
          <p className="text-sm font-semibold">Weekly Review</p>
          <p className="text-[10px] text-muted-foreground">Week of {weekOf}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xl font-bold text-white/60">{pct}%</p>
          <p className="text-[10px] text-muted-foreground">adherence</p>
        </div>
      </div>

      {/* Progress arc */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 bg-white/40"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{workoutsCompleted}/{workoutsPlanned} workouts</span>
      </div>

      <p className="text-xs text-foreground/80 leading-relaxed border-l-2 border-white/[0.07] pl-2">{aiVerdict}</p>

      {suggestions.length > 0 && (
        <ul className="space-y-1">
          {suggestions.map((s, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
              <span className="text-white/50 mt-0.5">•</span>
              {s}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={accept}
          disabled={accepted}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-white/[0.05] text-white/60 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <CheckCheck size={12} />
          {accepted ? "Accepted" : "Accept plan"}
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={12} />
          Adjust
        </button>
      </div>
    </div>
  );
}
