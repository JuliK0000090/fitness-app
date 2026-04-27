"use client";

import { useState } from "react";
import { RefreshCw, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export type ReplanSuggestion = {
  id: string;
  title: string;
  body: string;
  payload: {
    constraintId: string;
    constraintReason: string;
    movedDetails: Array<{
      workoutId: string;
      name: string;
      fromDate: string;
      toDate: string | null;
      reason: string;
    }>;
    createdAt: string;
  } | null;
};

export type ConstraintHeadsUp = {
  id: string;
  type: string;
  reason: string;
  endDate: string | null;
};

/**
 * Renders the active heads-up bar above /today: constraint chips that apply
 * today, plus a re-plan banner if any new PLAN_REPLANNED suggestion exists
 * in the last 24h.
 */
export function PlannerBanner({
  replan,
  constraintsToday,
}: {
  replan: ReplanSuggestion | null;
  constraintsToday: ConstraintHeadsUp[];
}) {
  const [dismissed, setDismissed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (constraintsToday.length === 0 && (!replan || dismissed)) return null;

  return (
    <div className="space-y-3">
      {/* Re-plan banner */}
      {replan && !dismissed && (
        <div className="border border-champagne/30 bg-champagne/[0.06] rounded-md px-4 py-3">
          <div className="flex items-start gap-3">
            <RefreshCw size={14} strokeWidth={1.5} className="text-champagne mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-body-sm text-text-primary font-medium">{replan.title}</p>
              <p className="text-caption text-text-muted mt-0.5">{replan.body}</p>
              <div className="flex items-center gap-3 mt-2">
                {replan.payload && replan.payload.movedDetails.length > 0 && (
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="text-caption text-champagne hover:underline underline-offset-2"
                  >
                    See changes
                  </button>
                )}
                <button
                  onClick={() => undoReplan(replan.id, replan.payload?.constraintId, () => setDismissed(true))}
                  className="text-caption text-text-muted hover:text-text-primary"
                >
                  Undo
                </button>
              </div>
            </div>
            <button
              onClick={() => dismissSuggestion(replan.id, () => setDismissed(true))}
              className="p-1 rounded text-text-disabled hover:text-text-muted shrink-0"
              aria-label="Dismiss"
            >
              <X size={12} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {/* Constraint heads-up */}
      {constraintsToday.length > 0 && (
        <div className="border border-border-subtle bg-bg-surface rounded-md px-4 py-2.5">
          <p className="text-[9px] tracking-widest uppercase text-text-disabled font-sans font-medium mb-1">
            Heads up today
          </p>
          <div className="space-y-1">
            {constraintsToday.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <ShieldAlert size={11} strokeWidth={1.5} className="text-amber shrink-0" />
                <p className="text-caption text-text-secondary">
                  {c.reason}
                  {c.endDate && (
                    <span className="text-text-disabled"> · until {c.endDate}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Changes drawer */}
      {drawerOpen && replan?.payload && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="bg-bg-surface border border-border-default rounded-t-lg sm:rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <p className="text-body-sm font-medium">Plan changes</p>
              <button onClick={() => setDrawerOpen(false)} className="p-1 rounded hover:bg-bg-elevated">
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-caption text-text-muted">
                Reason: <span className="text-text-secondary">{replan.payload.constraintReason}</span>
              </p>
              <div className="space-y-2">
                {replan.payload.movedDetails.map((m) => (
                  <div key={m.workoutId} className="border border-border-subtle rounded px-3 py-2">
                    <p className="text-body-sm text-text-primary">{m.name}</p>
                    <p className="text-caption text-text-muted">
                      {m.fromDate}{" → "}
                      {m.toDate ? (
                        <span className="text-text-secondary">{m.toDate}</span>
                      ) : (
                        <span className="text-terracotta">no clean slot found · review</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function dismissSuggestion(id: string, onSuccess: () => void) {
  const res = await fetch(`/api/planner/suggestions/${id}/dismiss`, { method: "POST" });
  if (res.ok) onSuccess();
  else toast.error("Could not dismiss");
}

async function undoReplan(id: string, constraintId: string | undefined, onSuccess: () => void) {
  if (!constraintId) {
    toast.error("Missing constraint reference");
    return;
  }
  if (!confirm("Undo the re-plan? The constraint will be marked inactive so you can edit it.")) return;
  const res = await fetch(`/api/planner/suggestions/${id}/undo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ constraintId }),
  });
  if (res.ok) {
    toast.success("Constraint deactivated. Edit it on /settings/constraints.");
    onSuccess();
  } else {
    toast.error("Could not undo");
  }
}
