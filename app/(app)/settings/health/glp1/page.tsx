"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MEDICATIONS = [
  { value: "semaglutide",  label: "Semaglutide (Ozempic / Wegovy)" },
  { value: "tirzepatide",  label: "Tirzepatide (Mounjaro / Zepbound)" },
  { value: "liraglutide",  label: "Liraglutide (Saxenda / Victoza)" },
  { value: "other",        label: "Other" },
];

type Profile = {
  active: boolean;
  medication: string | null;
  startedOn: string | null;
  doseSchedule: string | null;
  proteinTargetG: number | null;
  resistanceMinTarget: number | null;
  notes: string | null;
};

export default function GLP1SettingsPage() {
  const [profile, setProfile] = useState<Profile>({
    active: false,
    medication: null,
    startedOn: null,
    doseSchedule: "weekly",
    proteinTargetG: null,
    resistanceMinTarget: 150,
    notes: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/glp1")
      .then((r) => r.json())
      .then((d) => setProfile((p) => ({ ...p, ...d })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(updates: Partial<Profile>) {
    setProfile((p) => ({ ...p, ...updates }));
    setSaving(true);
    const res = await fetch("/api/settings/glp1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setSaving(false);
    if (!res.ok) toast.error("Couldn't save. Try again.");
  }

  if (loading) return <div className="p-6 text-text-muted text-sm">Loading...</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-text-primary mb-1">GLP-1 mode</h1>
        <p className="text-sm text-text-muted">
          When active, Vita adjusts your plan to protect lean muscle during weight loss — higher protein targets,
          minimum resistance training, and adjusted coaching tone.
        </p>
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between gap-4 py-3 border-b border-border-subtle">
        <div>
          <p className="text-sm font-medium text-text-primary">GLP-1 mode active</p>
          <p className="text-xs text-text-muted">Adjust training and coaching for GLP-1 medication</p>
        </div>
        <button
          role="switch"
          aria-checked={profile.active}
          onClick={() => save({ active: !profile.active })}
          className={cn(
            "shrink-0 w-10 h-6 rounded-full transition-colors relative",
            profile.active ? "bg-champagne" : "bg-border-default"
          )}
        >
          <span className={cn(
            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
            profile.active ? "translate-x-5" : "translate-x-1"
          )} />
        </button>
      </div>

      {profile.active && (
        <>
          {/* Medication */}
          <div className="space-y-2">
            <label className="text-xs text-text-disabled uppercase tracking-widest">Medication</label>
            <div className="space-y-1.5">
              {MEDICATIONS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => save({ medication: m.value })}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded border text-sm transition-colors",
                    profile.medication === m.value
                      ? "border-champagne/50 bg-champagne/10 text-text-primary"
                      : "border-border-subtle text-text-muted hover:border-border-default"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Started on */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-disabled uppercase tracking-widest">Started</label>
            <input
              type="date"
              value={profile.startedOn?.split("T")[0] ?? ""}
              onChange={(e) => save({ startedOn: e.target.value || null })}
              className="w-full bg-bg-surface border border-border-subtle rounded px-3 py-2 text-sm text-text-primary"
            />
          </div>

          {/* Protein target */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-disabled uppercase tracking-widest">Daily protein target (g)</label>
            <input
              type="number"
              min={60}
              max={300}
              value={profile.proteinTargetG ?? ""}
              onChange={(e) => save({ proteinTargetG: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="e.g. 140"
              className="w-full bg-bg-surface border border-border-subtle rounded px-3 py-2 text-sm text-text-primary"
            />
            <p className="text-xs text-text-muted">
              Recommended: body weight (kg) × 1.6. Vita uses this to assess whether your muscle is protected.
            </p>
          </div>

          {/* Resistance target */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-disabled uppercase tracking-widest">Resistance training target (min/week)</label>
            <input
              type="number"
              min={60}
              max={600}
              step={30}
              value={profile.resistanceMinTarget ?? ""}
              onChange={(e) => save({ resistanceMinTarget: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="150"
              className="w-full bg-bg-surface border border-border-subtle rounded px-3 py-2 text-sm text-text-primary"
            />
            <p className="text-xs text-text-muted">
              Minimum 150 min/week recommended. Vita will flag weeks where you fall short.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs text-text-disabled uppercase tracking-widest">Notes for Vita</label>
            <textarea
              value={profile.notes ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, notes: e.target.value }))}
              onBlur={() => save({ notes: profile.notes })}
              placeholder="Anything Vita should know about how this medication affects you..."
              rows={3}
              className="w-full bg-bg-surface border border-border-subtle rounded px-3 py-2 text-sm text-text-primary resize-none"
            />
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div className="border border-border-subtle rounded p-4">
        <p className="text-xs text-text-muted leading-relaxed">
          Vita is not a medical provider. This mode adjusts your training plan to support muscle preservation during
          GLP-1-assisted weight loss. Always coordinate medical decisions with your prescriber.
        </p>
      </div>

      {saving && <p className="text-xs text-text-muted">Saving...</p>}
    </div>
  );
}
