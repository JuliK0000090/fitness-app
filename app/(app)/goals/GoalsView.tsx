"use client";

import Link from "next/link";
import { Target, MessageSquarePlus, Calendar, TrendingUp, TrendingDown, CheckCircle2, Flame, Pause, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  habits: { id: string; title: string | null; icon: string | null }[];
  measurements: { date: string; value: number; unit: string }[];
}

// Separate ring and label — no overlap
function ProgressRing({ pct, size = 52 }: { pct: number; size?: number }) {
  const stroke = 3.5;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, Math.max(0, pct / 100)));
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.55)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
}

function CategoryPill({ category }: { category: string }) {
  const labels: Record<string, string> = {
    "body-composition": "Body",
    "performance": "Performance",
    "lifestyle": "Lifestyle",
    "aesthetic": "Aesthetic",
    "health": "Health",
  };
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-white/30 uppercase tracking-wider font-medium">
      {labels[category] ?? category}
    </span>
  );
}

function MiniSparkline({ measurements, targetValue }: {
  measurements: { date: string; value: number; unit: string }[];
  targetValue: number | null;
}) {
  const sorted = [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length < 2) return null;

  const vals = sorted.map((m) => m.value);
  const allVals = targetValue != null ? [...vals, targetValue] : vals;
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;

  const W = 240; const H = 32;
  const xScale = (i: number) => (i / (sorted.length - 1)) * W;
  const yScale = (v: number) => H - ((v - min) / range) * H;

  const points = sorted.map((m, i) => `${xScale(i).toFixed(1)},${yScale(m.value).toFixed(1)}`).join(" ");
  const lastX = xScale(sorted.length - 1);
  const lastY = yScale(sorted[sorted.length - 1].value);

  return (
    <div className="rounded-xl overflow-hidden bg-white/[0.02] px-2 py-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8">
        {targetValue != null && (
          <line x1={0} y1={yScale(targetValue)} x2={W} y2={yScale(targetValue)}
            stroke="rgba(255,255,255,0.12)" strokeDasharray="4,4" strokeWidth={1} />
        )}
        <polyline points={points} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r={2.5} fill="rgba(255,255,255,0.7)" />
      </svg>
    </div>
  );
}

function GoalCard({ goal, dimmed = false }: { goal: GoalData; dimmed?: boolean }) {
  const hasProgress = goal.targetValue != null && goal.startValue != null && goal.currentValue != null;

  // Guard division by zero and direction inversion
  const rangeSize = hasProgress ? Math.abs((goal.targetValue ?? 0) - (goal.startValue ?? 0)) : 0;
  const pct = hasProgress && rangeSize > 0
    ? Math.max(0, Math.min(100,
        Math.abs((goal.currentValue! - goal.startValue!) / rangeSize) * 100
      ))
    : null;

  const isAchieved = goal.status === "achieved";
  const isPaused   = goal.status === "paused";
  const isArchived = goal.status === "archived";

  const predictedDate = goal.predictedHitDate ? new Date(goal.predictedHitDate) : null;
  const deadlineDate  = goal.deadline ? new Date(goal.deadline) : null;
  const onTrack = predictedDate && deadlineDate ? predictedDate <= deadlineDate : null;

  // Days to deadline
  const daysLeft = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)
    : null;

  const urgencyColor =
    daysLeft != null && daysLeft <= 14 ? "text-amber-400/70" :
    daysLeft != null && daysLeft <= 7  ? "text-red-400/70" :
    "text-white/35";

  return (
    <div className={cn(
      "glass rounded-2xl overflow-hidden border border-white/[0.07] transition-opacity",
      dimmed && "opacity-50"
    )}>
      {/* Top accent bar — shows on-track status */}
      {!dimmed && onTrack !== null && (
        <div className={cn("h-px", onTrack ? "bg-white/20" : "bg-white/[0.07]")} />
      )}

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Progress ring — separate from text, no overlap */}
          <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
            {pct !== null ? (
              <>
                <ProgressRing pct={pct} size={44} />
                <span className="text-[10px] font-semibold text-white/50 tabular-nums">{Math.round(pct)}%</span>
              </>
            ) : (
              <div className="w-11 h-11 rounded-2xl border border-white/[0.07] flex items-center justify-center">
                {isAchieved ? <CheckCircle2 size={16} className="text-white/50" /> :
                 isPaused   ? <Pause size={14} className="text-white/35" /> :
                 isArchived ? <Archive size={14} className="text-white/25" /> :
                              <Target size={15} className="text-white/35" />}
              </div>
            )}
          </div>

          {/* Title + metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <p className="text-[15px] font-semibold text-white/90 leading-snug">{goal.title}</p>
              <CategoryPill category={goal.category} />
            </div>
            {goal.visionText && goal.visionText !== goal.title && (
              <p className="text-xs text-white/40 line-clamp-2 mt-0.5">{goal.visionText}</p>
            )}
            {/* Current → target */}
            {hasProgress && (
              <div className="flex items-baseline gap-1 mt-1.5">
                <span className="text-sm font-medium text-white/70 tabular-nums">{goal.currentValue}</span>
                <span className="text-xs text-white/30">→</span>
                <span className="text-sm text-white/45 tabular-nums">{goal.targetValue}</span>
                {goal.unit && <span className="text-xs text-white/30">{goal.unit}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar (only when no ring) */}
        {pct !== null && (
          <div className="h-px w-full bg-white/[0.07] rounded-full overflow-hidden">
            <div
              className="h-full bg-white/40 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Sparkline */}
        {goal.measurements.length >= 2 && (
          <MiniSparkline measurements={goal.measurements} targetValue={goal.targetValue} />
        )}

        {/* Date row */}
        <div className="flex items-center flex-wrap gap-3 text-[11px]">
          {deadlineDate && (
            <div className={cn("flex items-center gap-1", urgencyColor)}>
              <Calendar size={10} />
              <span>
                {daysLeft != null && daysLeft > 0
                  ? `${daysLeft}d left · ${format(deadlineDate, "MMM d")}`
                  : daysLeft === 0
                    ? "Due today"
                    : format(deadlineDate, "MMM d, yyyy")}
              </span>
            </div>
          )}
          {predictedDate && (
            <div className={cn("flex items-center gap-1", onTrack ? "text-white/50" : "text-amber-400/60")}>
              {onTrack ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              <span>{onTrack ? "On track" : "Behind"} · predicted {format(predictedDate, "MMM d")}</span>
            </div>
          )}
          {!predictedDate && !deadlineDate && (
            <span className="text-white/20">No deadline set — tell Vita when you want to achieve this</span>
          )}
          {!predictedDate && goal.measurements.length < 3 && goal.measurements.length > 0 && (
            <span className="text-white/20">Log {3 - goal.measurements.length} more measurement{3 - goal.measurements.length !== 1 ? "s" : ""} to see trajectory</span>
          )}
        </div>

        {/* Habits */}
        {goal.habits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {goal.habits.slice(0, 5).map((h) => (
              <span key={h.id} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/35">
                <Flame size={8} className="text-white/20" />
                {h.title ?? "Habit"}
              </span>
            ))}
            {goal.habits.length > 5 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/20">
                +{goal.habits.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* No habits nudge */}
        {goal.habits.length === 0 && !isAchieved && !isArchived && (
          <Link href="/chat" className="text-[11px] text-white/25 hover:text-white/45 transition-colors">
            Ask Vita to add habits for this goal →
          </Link>
        )}
      </div>
    </div>
  );
}

interface GoalsViewProps {
  goals: GoalData[];
}

export function GoalsView({ goals }: GoalsViewProps) {
  const active   = goals.filter((g) => g.status === "active");
  const paused   = goals.filter((g) => g.status === "paused");
  const achieved = goals.filter((g) => g.status === "achieved");
  const archived = goals.filter((g) => g.status === "archived");

  return (
    <div className="max-w-lg mx-auto py-6 px-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 mb-1">Your goals</p>
          <h1 className="text-xl font-semibold text-white/90">
            {active.length > 0 ? `${active.length} active` : "No active goals"}
          </h1>
        </div>
        <Link
          href="/chat"
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white/[0.05] text-white/55 hover:bg-white/[0.09] transition-colors border border-white/[0.06]"
        >
          <MessageSquarePlus size={13} />
          New goal
        </Link>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center border border-white/[0.06]">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
            <Target size={24} className="text-white/30" />
          </div>
          <p className="text-sm font-medium text-white/60 mb-1">Tell Vita what you want</p>
          <p className="text-xs text-white/30 mb-6 max-w-xs mx-auto">
            One sentence is enough. "I want to lose 5 kg by July" or "I want to run a 5K in under 30 minutes." She builds the full plan.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl bg-white/[0.07] text-white/65 hover:bg-white/[0.1] transition-colors"
          >
            <MessageSquarePlus size={15} />
            Set a goal with Vita
          </Link>
        </div>
      )}

      {/* Active goals */}
      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      )}

      {/* Active empty but other goals exist */}
      {active.length === 0 && goals.length > 0 && (
        <div className="glass rounded-2xl p-5 text-center border border-white/[0.06]">
          <p className="text-sm text-white/45 mb-1">No active goals right now.</p>
          <p className="text-xs text-white/25 mb-4">All your goals are paused or completed. Tell Vita what you want to focus on next.</p>
          <Link href="/chat" className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-white/[0.05] text-white/50 hover:bg-white/[0.08] transition-colors">
            <MessageSquarePlus size={12} />
            Start a new goal
          </Link>
        </div>
      )}

      {/* Paused */}
      {paused.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 px-1">Paused</p>
          {paused.map((g) => <GoalCard key={g.id} goal={g} dimmed />)}
        </div>
      )}

      {/* Achieved */}
      {achieved.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 px-1">Achieved</p>
          {achieved.map((g) => <GoalCard key={g.id} goal={g} dimmed />)}
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/25 px-1">Archived</p>
          {archived.map((g) => <GoalCard key={g.id} goal={g} dimmed />)}
        </div>
      )}
    </div>
  );
}
