"use client";

import { Target, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface GoalCardProps {
  goalId: string;
  description: string;
  direction: string;
  magnitude?: number;
  unit?: string;
  deadline?: string;
  status: string;
  predictedHitDate?: string;
}

export function GoalCard({ description, direction, magnitude, unit, deadline, status, predictedHitDate }: GoalCardProps) {
  const isOnTrack = predictedHitDate && deadline
    ? new Date(predictedHitDate) <= new Date(deadline)
    : null;

  const statusColor = {
    active: "text-white/60 bg-white/10",
    achieved: "text-white/60 bg-white/10",
    paused: "text-white/60 bg-white/10",
    cancelled: "text-muted-foreground bg-secondary",
  }[status] ?? "text-muted-foreground bg-secondary";

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-white/[0.07]">
      <div className="flex items-start gap-2">
        <div className="border border-white/[0.07] w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
          <Target size={16} className="text-white/50" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">{description}</p>
          {magnitude && unit && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {direction === "decrease" ? <TrendingDown size={10} className="inline mr-1" /> : <TrendingUp size={10} className="inline mr-1" />}
              {direction} {magnitude} {unit}
            </p>
          )}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{status}</span>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        {deadline && (
          <div className="flex items-center gap-1">
            <Calendar size={11} />
            <span>Target: {format(new Date(deadline), "MMM d, yyyy")}</span>
          </div>
        )}
        {predictedHitDate && (
          <div className={`flex items-center gap-1 ${isOnTrack ? "text-white/60" : "text-white/60"}`}>
            <span>{isOnTrack ? "✓ On track" : "⚠ Behind"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
