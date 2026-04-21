"use client";

import Link from "next/link";
import { Target, MessageSquarePlus, Calendar, TrendingUp, TrendingDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface GoalData {
  id: string;
  title: string;
  category: string;
  visionText: string | null;
  status: string;
  targetMetric: string | null;
  targetValue: number | null;
  startValue: number | null;
  currentValue: number | null;
  unit: string | null;
  deadline: string | null;
  predictedHitDate: string | null;
  habits: { id: string; title: string; icon: string | null }[];
  measurements: { date: string; value: number; unit: string }[];
}

function ProgressRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, Math.max(0, pct / 100)));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.5)" strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function GoalCard({ goal }: { goal: GoalData }) {
  const hasProgress = goal.targetValue != null && goal.startValue != null && goal.currentValue != null;
  const pct = hasProgress
    ? Math.max(0, Math.min(100,
        ((goal.currentValue! - goal.startValue!) / (goal.targetValue! - goal.startValue!)) * 100
      ))
    : null;

  const isAchieved = goal.status === "achieved" || goal.status === "ACHIEVED";
  const isPaused = goal.status === "paused" || goal.status === "PAUSED";
  const isArchived = goal.status === "archived" || goal.status === "ARCHIVED";

  const predictedDate = goal.predictedHitDate ? new Date(goal.predictedHitDate) : null;
  const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;
  const onTrack = predictedDate && deadlineDate ? predictedDate <= deadlineDate : null;

  const statusBadge = {
    active: null,
    ACTIVE: null,
    paused: "Paused",
    PAUSED: "Paused",
    achieved: "Achieved",
    ACHIEVED: "Achieved",
    archived: "Archived",
    ARCHIVED: "Archived",
  }[goal.status];

  return (
    <div className={cn("glass rounded-2xl p-5 space-y-4 border border-white/[0.07]", (isPaused || isArchived) && "opacity-60")}>
      {/* Header row */}
      <div className="flex items-start gap-4">
        {pct !== null ? (
          <div className="shrink-0 relative">
            <ProgressRing pct={pct} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/50 font-medium">
              {Math.round(pct)}%
            </span>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-2xl border border-white/[0.07] flex items-center justify-center shrink-0">
            <Target size={18} className="text-white/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white/85 leading-tight">{goal.title}</p>
            {statusBadge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.07] text-white/40 shrink-0">{statusBadge}</span>
            )}
            {isAchieved && <CheckCircle2 size={14} className="text-white/60 shrink-0" />}
          </div>
          {goal.visionText && goal.visionText !== goal.title && (
            <p className="text-xs text-white/35 mt-0.5 line-clamp-2">{goal.visionText}</p>
          )}
          {hasProgress && (
            <p className="text-xs text-white/40 mt-1">
              {goal.currentValue} → {goal.targetValue} {goal.unit}
            </p>
          )}
        </div>
      </div>

      {/* Trajectory */}
      {goal.measurements.length >= 2 && (
        <MiniSparkline measurements={goal.measurements} targetValue={goal.targetValue} unit={goal.unit} />
      )}

      {/* Date row */}
      <div className="flex items-center gap-4 text-[11px] text-white/35">
        {deadlineDate && (
          <div className="flex items-center gap-1">
            <Calendar size={10} />
            <span>Target {format(deadlineDate, "MMM d, yyyy")}</span>
          </div>
        )}
        {predictedDate && (
          <div className={cn("flex items-center gap-1", onTrack ? "text-white/50" : "text-white/35")}>
            {onTrack ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            <span>Predicted {format(predictedDate, "MMM d")}</span>
            {onTrack === false && <span className="text-white/30"> · behind</span>}
          </div>
        )}
        {!predictedDate && goal.measurements.length < 3 && (
          <span className="text-white/20">Need 3+ measurements for prediction</span>
        )}
      </div>

      {/* Contributing habits */}
      {goal.habits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {goal.habits.slice(0, 4).map((h) => (
            <span key={h.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/35">
              {h.title}
            </span>
          ))}
          {goal.habits.length > 4 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/25">
              +{goal.habits.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MiniSparkline({ measurements, targetValue, unit }: {
  measurements: { date: string; value: number; unit: string }[];
  targetValue: number | null;
  unit: string | null;
}) {
  const sorted = [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length < 2) return null;

  const vals = sorted.map((m) => m.value);
  const min = Math.min(...vals, targetValue ?? Infinity);
  const max = Math.max(...vals, targetValue ?? -Infinity);
  const range = max - min || 1;

  const W = 220; const H = 36;
  const xScale = (i: number) => (i / (sorted.length - 1)) * W;
  const yScale = (v: number) => H - ((v - min) / range) * H;

  const points = sorted.map((m, i) => `${xScale(i).toFixed(1)},${yScale(m.value).toFixed(1)}`).join(" ");

  return (
    <div className="overflow-hidden rounded-lg">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-9">
        {targetValue != null && (
          <line x1={0} y1={yScale(targetValue)} x2={W} y2={yScale(targetValue)}
            stroke="rgba(255,255,255,0.15)" strokeDasharray="3,3" strokeWidth={1} />
        )}
        <polyline points={points} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeLinejoin="round" />
        {sorted.map((m, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(m.value)} r={2} fill="rgba(255,255,255,0.5)" />
        ))}
      </svg>
    </div>
  );
}

interface GoalsViewProps {
  goals: GoalData[];
}

export function GoalsView({ goals }: GoalsViewProps) {
  const active = goals.filter((g) => g.status === "active" || g.status === "ACTIVE");
  const other = goals.filter((g) => g.status !== "active" && g.status !== "ACTIVE");

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <Target size={18} className="text-white/50" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Goals</h1>
            <p className="text-xs text-muted-foreground">{active.length} active</p>
          </div>
        </div>
        <Link
          href="/chat"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white/[0.04] text-white/50 hover:bg-white/[0.07] transition-colors"
        >
          <MessageSquarePlus size={12} />
          New goal
        </Link>
      </div>

      {active.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Target size={32} className="mx-auto mb-4 text-white/20" />
          <p className="text-sm text-white/40 mb-2">No active goals yet.</p>
          <p className="text-xs text-white/25 mb-5">Tell Vita what you want to achieve — she builds your full plan from a single sentence.</p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-white/[0.06] text-white/60 hover:bg-white/[0.09] transition-colors"
          >
            <MessageSquarePlus size={14} />
            Set a goal with Vita
          </Link>
        </div>
      )}

      {active.map((g) => <GoalCard key={g.id} goal={g} />)}

      {other.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider pt-2 px-1">Past goals</p>
          {other.map((g) => <GoalCard key={g.id} goal={g} />)}
        </>
      )}
    </div>
  );
}
