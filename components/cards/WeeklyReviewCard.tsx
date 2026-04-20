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
  const color = pct >= 80 ? "#34D399" : pct >= 50 ? "#FBBF24" : "#F472B6";

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-[#A78BFA]/20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#A78BFA]/20 flex items-center justify-center">
          <BarChart2 size={16} className="text-[#A78BFA]" />
        </div>
        <div>
          <p className="text-sm font-semibold">Weekly Review</p>
          <p className="text-[10px] text-muted-foreground">Week of {weekOf}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xl font-bold" style={{ color }}>{pct}%</p>
          <p className="text-[10px] text-muted-foreground">adherence</p>
        </div>
      </div>

      {/* Progress arc */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${color}88, ${color})` }}
        />
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{workoutsCompleted}/{workoutsPlanned} workouts</span>
      </div>

      <p className="text-xs text-foreground/80 leading-relaxed border-l-2 border-[#A78BFA]/40 pl-2">{aiVerdict}</p>

      {suggestions.length > 0 && (
        <ul className="space-y-1">
          {suggestions.map((s, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
              <span className="text-[#A78BFA] mt-0.5">•</span>
              {s}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={accept}
          disabled={accepted}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-[#34D399]/10 text-[#34D399] hover:bg-[#34D399]/20 transition-colors disabled:opacity-50"
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
