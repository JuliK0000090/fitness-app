"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Trash2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TREATMENT_DEFAULTS } from "@/lib/coach/constraints";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";

type ConstraintRow = {
  id: string;
  type: string;
  scope: string;
  startDate: string;
  endDate: string | null;
  payload: Record<string, unknown>;
  reason: string;
  source: string;
  active: boolean;
};

type FormState = {
  treatmentKey: string | null;
  type: string;
  scope: string;
  startDate: string;
  endDate: string;
  reason: string;
  payloadText: string; // raw JSON the user can edit for non-treatment types
};

const TYPE_LABELS: Record<string, string> = {
  TREATMENT: "Treatment",
  INJURY: "Injury",
  ILLNESS: "Illness",
  TRAVEL: "Travel",
  SCHEDULE_BLACKOUT: "Schedule blackout",
  ACTIVITY_RESTRICTION: "Activity restriction",
  PREFERENCE: "Preference",
  CYCLE_PHASE: "Cycle phase",
  RECOVERY_REQUIREMENT: "Recovery rule",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function ConstraintsView({ initial }: { initial: ConstraintRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [adding, setAdding] = useState(false);

  async function refresh() {
    router.refresh();
    const res = await fetch("/api/planner/constraints");
    const json = await res.json();
    if (json.constraints) {
      setRows(json.constraints.map((c: ConstraintRow) => ({
        ...c,
        startDate: c.startDate.split("T")[0],
        endDate: c.endDate ? (c.endDate as string).split("T")[0] : null,
      })));
    }
  }

  async function resolveConstraint(id: string) {
    const res = await fetch(`/api/planner/constraints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    if (res.ok) {
      toast.success("Marked resolved");
      refresh();
    } else {
      toast.error("Could not resolve");
    }
  }

  async function deleteConstraint(id: string) {
    if (!confirm("Delete this constraint? It will no longer affect future plans.")) return;
    const res = await fetch(`/api/planner/constraints/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error("Could not delete");
    }
  }

  const active = rows.filter((r) => r.active);
  const resolved = rows.filter((r) => !r.active);

  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-8">
      <Link href="/settings" className="inline-flex items-center gap-1 text-caption text-text-muted hover:text-text-primary">
        <ChevronLeft size={13} strokeWidth={1.5} />
        Settings
      </Link>

      <PageHeader eyebrow="Plan" title="Constraints" rule={true} />

      <p className="text-body-sm text-text-muted">
        Treatments, injuries, travel, and other rules that the workout planner respects. Vita also adds these
        automatically when you mention them in chat.
      </p>

      {/* Add button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-border-default rounded-md py-3 text-body-sm text-text-secondary hover:bg-bg-elevated transition-colors"
        >
          <Plus size={14} strokeWidth={1.5} />
          Add constraint
        </button>
      )}

      {adding && (
        <AddConstraintForm
          onCancel={() => setAdding(false)}
          onCreated={() => { setAdding(false); refresh(); }}
        />
      )}

      {/* Active list */}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Active</p>
          {active.map((c) => (
            <ConstraintCard
              key={c.id}
              c={c}
              onResolve={() => resolveConstraint(c.id)}
              onDelete={() => deleteConstraint(c.id)}
            />
          ))}
        </div>
      )}

      {active.length === 0 && !adding && (
        <p className="text-body-sm text-text-disabled text-center py-8 border border-dashed border-border-subtle rounded-md">
          No active constraints. Vita will add them automatically when you mention treatments, injuries, or blackouts in chat.
        </p>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="space-y-2">
          <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Resolved</p>
          {resolved.slice(0, 10).map((c) => (
            <ConstraintCard key={c.id} c={c} onDelete={() => deleteConstraint(c.id)} dimmed />
          ))}
        </div>
      )}
    </div>
  );
}

function ConstraintCard({
  c, onResolve, onDelete, dimmed = false,
}: {
  c: ConstraintRow;
  onResolve?: () => void;
  onDelete: () => void;
  dimmed?: boolean;
}) {
  return (
    <div className={`border border-border-subtle bg-bg-surface rounded-md px-4 py-3 ${dimmed ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] tracking-widest uppercase text-text-disabled">{TYPE_LABELS[c.type] ?? c.type}</span>
            {c.scope !== "HARD" && (
              <span className="text-[9px] tracking-widest uppercase text-text-disabled">· {c.scope}</span>
            )}
          </div>
          <p className="text-body-sm text-text-primary">{c.reason}</p>
          <p className="text-caption text-text-disabled mt-0.5">
            {c.startDate}{c.endDate ? ` → ${c.endDate}` : " → ongoing"}
            {c.source !== "manual_settings" && ` · ${c.source.replace("_", " ")}`}
          </p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {onResolve && (
            <button
              onClick={onResolve}
              className="text-[10px] uppercase tracking-widest text-text-muted hover:text-text-primary px-2 py-1 rounded"
              title="Mark resolved"
            >
              Resolve
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-text-disabled hover:text-terracotta p-1.5 rounded"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 size={12} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddConstraintForm({
  onCancel, onCreated,
}: { onCancel: () => void; onCreated: () => void }) {
  const [state, setState] = useState<FormState>({
    treatmentKey: null,
    type: "INJURY",
    scope: "HARD",
    startDate: todayStr(),
    endDate: "",
    reason: "",
    payloadText: "",
  });
  const [saving, setSaving] = useState(false);

  function pickTreatment(key: string) {
    const tpl = TREATMENT_DEFAULTS[key];
    setState((prev) => ({
      ...prev,
      treatmentKey: key,
      type: "TREATMENT",
      reason: prev.reason || `${tpl.label} — ${tpl.restrictions.join(", ")} for ${tpl.durationDays}d`,
    }));
  }

  async function submit() {
    setSaving(true);
    try {
      let payload: Record<string, unknown> | undefined;
      if (state.payloadText.trim()) {
        try { payload = JSON.parse(state.payloadText); }
        catch { toast.error("Payload is not valid JSON"); setSaving(false); return; }
      }
      const body: Record<string, unknown> = {
        scope: state.scope,
        startDate: state.startDate,
        endDate: state.endDate || null,
        reason: state.reason.trim() || (state.treatmentKey ? TREATMENT_DEFAULTS[state.treatmentKey].label : "Constraint"),
      };
      if (state.treatmentKey) {
        body.treatmentKey = state.treatmentKey;
      } else {
        body.type = state.type;
        if (payload) body.payload = payload;
      }
      const res = await fetch("/api/planner/constraints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e.error || "Could not save constraint");
        setSaving(false);
        return;
      }
      toast.success("Saved");
      onCreated();
    } catch {
      toast.error("Could not save");
      setSaving(false);
    }
  }

  return (
    <div className="border border-border-default bg-bg-surface rounded-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm font-medium">New constraint</p>
        <button onClick={onCancel} className="p-1 rounded hover:bg-bg-elevated" aria-label="Cancel">
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Treatment templates */}
      <div className="space-y-2">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Common treatments</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(TREATMENT_DEFAULTS).map(([key, tpl]) => (
            <button
              key={key}
              onClick={() => pickTreatment(key)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1
                ${state.treatmentKey === key
                  ? "border-champagne/50 bg-champagne/10 text-champagne"
                  : "border-border-subtle text-text-muted hover:border-border-default"}`}
            >
              <Sparkles size={10} strokeWidth={1.5} />
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type — hidden when treatment shortcut chosen */}
      {!state.treatmentKey && (
        <div className="space-y-1">
          <label className="text-caption text-text-muted">Type</label>
          <select
            value={state.type}
            onChange={(e) => setState((s) => ({ ...s, type: e.target.value }))}
            className="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-body-sm"
          >
            {Object.entries(TYPE_LABELS).filter(([k]) => k !== "TREATMENT").map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-caption text-text-muted">Start date</label>
          <input
            type="date"
            value={state.startDate}
            onChange={(e) => setState((s) => ({ ...s, startDate: e.target.value }))}
            className="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-body-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-caption text-text-muted">End date <span className="text-text-disabled">(optional)</span></label>
          <input
            type="date"
            value={state.endDate}
            onChange={(e) => setState((s) => ({ ...s, endDate: e.target.value }))}
            className="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-body-sm"
            placeholder={state.treatmentKey ? "Auto-filled" : "Indefinite"}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-caption text-text-muted">Reason (one-line)</label>
        <input
          type="text"
          value={state.reason}
          onChange={(e) => setState((s) => ({ ...s, reason: e.target.value }))}
          placeholder='e.g. "tweaked left knee — no running"'
          className="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-body-sm"
        />
      </div>

      {/* Scope */}
      <div className="space-y-1">
        <label className="text-caption text-text-muted">Strictness</label>
        <div className="flex gap-2">
          {["HARD", "SOFT", "ADVISORY"].map((s) => (
            <button
              key={s}
              onClick={() => setState((prev) => ({ ...prev, scope: s }))}
              className={`flex-1 text-caption py-1.5 rounded border transition-colors
                ${state.scope === s
                  ? "border-champagne/50 bg-champagne/10 text-champagne"
                  : "border-border-subtle text-text-muted hover:border-border-default"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Payload — only for non-treatment types */}
      {!state.treatmentKey && (
        <details className="text-caption">
          <summary className="text-text-muted cursor-pointer">Advanced: payload JSON</summary>
          <textarea
            value={state.payloadText}
            onChange={(e) => setState((s) => ({ ...s, payloadText: e.target.value }))}
            placeholder='e.g. { "bodyPart": "left knee", "allowedActivities": ["upper_body", "core"] }'
            rows={4}
            className="w-full mt-2 bg-bg-base border border-border-default rounded px-2 py-1.5 text-caption font-mono"
          />
        </details>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded border border-border-default text-body-sm text-text-muted hover:bg-bg-elevated"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="flex-1 py-2 rounded bg-champagne text-champagne-fg text-body-sm hover:bg-champagne-soft disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
