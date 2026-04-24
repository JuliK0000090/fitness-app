"use client";

import Link from "next/link";
import { Target, MessageSquarePlus, Calendar, TrendingUp, TrendingDown, CheckCircle2, Pause, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";

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

function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const stroke = 2.5;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, Math.max(0, pct / 100)));
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(212,196,168,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(212,196,168,0.6)" strokeWidth={stroke}
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
    <span className="text-[9px] px-1.5 py-0.5 rounded border border-border-subtle text-text-disabled uppercase tracking-widest font-medium">
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
    <div className="rounded overflow-hidden bg-bg-inset border border-border-subtle px-2 py-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8">
        {targetValue != null && (
          <line x1={0} y1={yScale(targetValue)} x2={W} y2={yScale(targetValue)}
            stroke="rgba(212,196,168,0.15)" strokeDasharray="4,4" strokeWidth={1} />
        )}
        <polyline points={points} fill="none" stroke="rgba(212,196,168,0.45)" strokeWidth={1.5} strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r={2.5} fill="rgba(212,196,168,0.8)" />
      </svg>
    </div>
  );
}

function GoalCard({ goal, dimmed = false }: { goal: GoalData; dimmed?: boolean }) {
  const hasProgress = goal.targetValue != null && goal.startValue != null && goal.currentValue != null;

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

  const daysLeft = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)
    : null;

  const urgencyColor =
    daysLeft != null && daysLeft <= 7  ? "text-terracotta" :
    daysLeft != null && daysLeft <= 14 ? "text-amber" :
    "text-text-disabled";

  return (
    <div className={cn(
      "border border-border-subtle bg-bg-surface rounded-md overflow-hidden transition-opacity",
      dimmed && "opacity-40"
    )}>
      {/* On-track accent line */}
      {!dimmed && onTrack !== null && (
        <div className={cn("h-px", onTrack ? "bg-champagne/30" : "bg-border-subtle")} />
      )}

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
            {pct !== null ? (
              <>
                <ProgressRing pct={pct} size={44} />
                <span className="text-caption text-champagne tabular-nums">{Math.round(pct)}%</span>
              </>
            ) : (
              <div className="w-11 h-11 rounded border border-border-default bg-bg-elevated flex items-center justify-center">
                {isAchieved ? <CheckCircle2 size={15} strokeWidth={1.5} className="text-sage" /> :
                 isPaused   ? <Pause size={13} strokeWidth={1.5} className="text-text-disabled" /> :
                 isArchived ? <Archive size={13} strokeWidth={1.5} className="text-text-disabled" /> :
                              <Target size={14} strokeWidth={1.5} className="text-text-muted" />}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-body font-medium text-text-primary leading-snug">{goal.title}</p>
              <CategoryPill category={goal.category} />
            </div>
            {goal.visionText && goal.visionText !== goal.title && (
              <p className="text-caption text-text-muted line-clamp-2 mt-0.5">{goal.visionText}</p>
            )}
            {hasProgress && (
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-body-sm font-medium text-text-secondary tabular-nums">{goal.currentValue}</span>
                <span className="text-caption text-text-disabled">→</span>
                <span className="text-body-sm text-text-muted tabular-nums">{goal.targetValue}</span>
                {goal.unit && <span className="text-caption text-text-disabled">{goal.unit}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div className="h-px w-full bg-border-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-champagne/60 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Sparkline */}
        {goal.measurements.length >= 2 && (
          <MiniSparkline measurements={goal.measurements} targetValue={goal.targetValue} />
        )}

        {/* Date row */}
        <div className="flex items-center flex-wrap gap-3 text-caption">
          {deadlineDate && (
            <div className={cn("flex items-center gap-1", urgencyColor)}>
              <Calendar size={10} strokeWidth={1.5} />
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
            <div className={cn("flex items-center gap-1", onTrack ? "text-sage" : "text-amber")}>
              {onTrack
                ? <TrendingUp size={10} strokeWidth={1.5} />
                : <TrendingDown size={10} strokeWidth={1.5} />}
              <span>{onTrack ? "On track" : "Behind"} · predicted {format(predictedDate, "MMM d")}</span>
            </div>
          )}
          {!predictedDate && !deadlineDate && (
            <span className="text-text-disabled">No deadline set — tell Vita when you want to achieve this</span>
          )}
          {!predictedDate && goal.measurements.length < 3 && goal.measurements.length > 0 && (
            <span className="text-text-disabled">Log {3 - goal.measurements.length} more measurement{3 - goal.measurements.length !== 1 ? "s" : ""} to see trajectory</span>
          )}
        </div>

        {/* Habits */}
        {goal.habits.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {goal.habits.slice(0, 5).map((h) => (
              <span key={h.id} className="text-caption px-2 py-0.5 rounded border border-border-subtle text-text-disabled">
                {h.title ?? "Habit"}
              </span>
            ))}
            {goal.habits.length > 5 && (
              <span className="text-caption px-2 py-0.5 rounded border border-border-subtle text-text-disabled">
                +{goal.habits.length - 5} more
              </span>
            )}
          </div>
        )}

        {goal.habits.length === 0 && !isAchieved && !isArchived && (
          <Link href="/chat" className="text-caption text-text-disabled hover:text-text-muted transition-colors">
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
    <div className="max-w-lg mx-auto px-5 py-10 space-y-8">

      <div className="flex items-end justify-between gap-4">
        <PageHeader
          eyebrow="Your goals"
          title={active.length > 0 ? `${active.length} active` : "Goals"}
          rule={false}
        />
        <Link
          href="/chat"
          className="shrink-0 flex items-center gap-1.5 text-caption px-3 py-2 rounded border border-border-default text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors"
        >
          <MessageSquarePlus size={12} strokeWidth={1.5} />
          New goal
        </Link>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="border border-border-subtle bg-bg-surface rounded-md p-10 text-center space-y-5">
          <Target size={24} strokeWidth={1.5} className="mx-auto text-text-disabled" />
          <div className="space-y-1">
            <p className="text-body-sm font-medium text-text-secondary">Tell Vita what you want</p>
            <p className="text-caption text-text-muted max-w-xs mx-auto">
              One sentence is enough. "I want to lose 5 kg by July." She builds the full plan.
            </p>
          </div>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 text-caption px-4 py-2 rounded border border-border-default text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors"
          >
            <MessageSquarePlus size={12} strokeWidth={1.5} />
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

      {active.length === 0 && goals.length > 0 && (
        <div className="border border-border-subtle bg-bg-surface rounded-md p-6 text-center space-y-3">
          <p className="text-body-sm text-text-muted">No active goals right now.</p>
          <p className="text-caption text-text-disabled">Tell Vita what you want to focus on next.</p>
          <Link href="/chat" className="inline-flex items-center gap-1.5 text-caption px-4 py-2 rounded border border-border-default text-text-muted hover:text-text-secondary transition-colors">
            <MessageSquarePlus size={12} strokeWidth={1.5} />
            Start a new goal
          </Link>
        </div>
      )}

      {paused.length > 0 && (
        <div className="space-y-2">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Paused</p>
          {paused.map((g) => <GoalCard key={g.id} goal={g} dimmed />)}
        </div>
      )}

      {achieved.length > 0 && (
        <div className="space-y-2">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Achieved</p>
          {achieved.map((g) => <GoalCard key={g.id} goal={g} dimmed />)}
        </div>
      )}

      {archived.length > 0 && (
        <div className="space-y-2">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Archived</p>
          {archived.map((g) => <GoalCard key={g.id} goal={g} dimmed />)}
        </div>
      )}
    </div>
  );
}
