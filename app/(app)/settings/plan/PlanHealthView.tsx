"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";

type Target = { id: string; name: string; count: number };
type WeekRow = { label: string; planned: number; expected: number };

export function PlanHealthView({ targets, weeks }: { targets: Target[]; weeks: WeekRow[] }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function regenerate() {
    setRunning(true);
    try {
      const res = await fetch("/api/planner/regenerate", { method: "POST" });
      if (!res.ok) {
        toast.error("Could not regenerate");
        return;
      }
      const data = await res.json();
      toast.success(
        `Regenerated. Created ${data.workoutsCreated} new workouts across ${data.weeksProcessed} weeks.`,
      );
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  const totalPlanned = weeks.reduce((s, w) => s + w.planned, 0);
  const totalExpected = weeks.reduce((s, w) => s + w.expected, 0);

  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-8">
      <Link href="/settings" className="inline-flex items-center gap-1 text-caption text-text-muted hover:text-text-primary">
        <ChevronLeft size={13} strokeWidth={1.5} />
        Settings
      </Link>

      <PageHeader eyebrow="Plan" title="Plan health" rule={true} />

      <p className="text-body-sm text-text-muted">
        Vita generates a rolling 8-week schedule from your weekly targets. Constraints
        (treatments, injuries, travel) automatically reshape upcoming weeks. If a week
        falls short — for example after adding a constraint — regenerating fills the gaps.
      </p>

      {/* Targets */}
      <div className="space-y-2">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Weekly targets</p>
        {targets.length === 0 ? (
          <p className="text-body-sm text-text-disabled border border-dashed border-border-subtle rounded-md py-4 text-center">
            No active weekly targets. Tell Vita your goal and she'll set them.
          </p>
        ) : (
          <div className="border border-border-subtle bg-bg-surface rounded-md divide-y divide-border-subtle">
            {targets.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-body-sm text-text-primary">{t.name}</p>
                <p className="text-caption text-text-muted">{t.count}/wk</p>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2.5 bg-bg-elevated">
              <p className="text-body-sm font-medium text-text-primary">Total</p>
              <p className="text-caption text-text-secondary">
                {targets.reduce((s, t) => s + t.count, 0)}/wk
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Per-week breakdown */}
      <div className="space-y-2">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Next 8 weeks</p>
        <div className="border border-border-subtle bg-bg-surface rounded-md divide-y divide-border-subtle">
          {weeks.map((w, i) => {
            const ratio = w.expected === 0 ? 1 : w.planned / w.expected;
            const status = ratio >= 1 ? "ok" : ratio >= 0.7 ? "near" : "short";
            const dot =
              status === "ok" ? "bg-sage" :
              status === "near" ? "bg-amber" :
              "bg-terracotta";
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
                <p className="text-caption text-text-secondary flex-1">{w.label}</p>
                <p className="text-caption text-text-muted tabular-nums">{w.planned}/{w.expected}</p>
              </div>
            );
          })}
        </div>
        <p className="text-caption text-text-disabled">
          Total scheduled: {totalPlanned}/{totalExpected} across 8 weeks.
        </p>
      </div>

      {/* Regenerate button */}
      <div className="space-y-2">
        <button
          onClick={regenerate}
          disabled={running || targets.length === 0}
          className="w-full flex items-center justify-center gap-2 border border-border-default rounded-md py-3 text-body-sm bg-bg-surface hover:bg-bg-elevated disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={13} strokeWidth={1.5} className={running ? "animate-spin" : ""} />
          {running ? "Regenerating…" : "Regenerate next 8 weeks"}
        </button>
        <p className="text-caption text-text-disabled">
          Safe to run anytime. Done / Skipped / Moved workouts and any you've manually moved are never touched.
        </p>
      </div>
    </div>
  );
}
