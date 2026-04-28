"use client";

/**
 * Single-screen progressive onboarding. Five steps live on one page; the
 * step state is local React state, not URL-driven, so the back button
 * leaves the flow rather than rewinding it.
 *
 *   1. Name + timezone (auto-detected, confirmable)
 *   2. Goal capture — voice (Web Speech) OR text. Voice falls back to
 *      text on any failure (no permission, no result, unsupported).
 *   3. Confirm GoalDraft — every field editable
 *   4. Wearable invite (Apple Health route or Later)
 *   5. Accountability partner invite (form or Skip)
 *
 * Then routes to /today.
 *
 * Restraint rules:
 *   - No emoji
 *   - Restrained Vita voice
 *   - No multi-page wizard chrome — one screen, content swaps
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, ArrowRight, Check, X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, GoalDraft, GoalCategory, GoalDraftHabit, GoalDraftWorkout } from "@/lib/onboarding/types";

type Step = 1 | 2 | 3 | 4 | 5;

const EXAMPLE_CHIPS = [
  "feel strong for my sister's wedding July 14",
  "lose 3cm off my waist",
  "splits by Christmas",
];

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState<string>("UTC");
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch { /* noop */ }
  }, []);

  // Step 2
  const [goalText, setGoalText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState<GoalDraft | null>(null);

  // Step 3 (uses `draft`)
  const [committing, setCommitting] = useState(false);

  // Step 5
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");

  async function submitGoal(text: string) {
    if (parsing) return;
    setParsing(true);
    try {
      const res = await fetch("/api/onboarding/parse-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, timezone }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e.error || "Couldn't read your goal — try again");
        return;
      }
      const data = await res.json();
      setDraft(data.draft);
      setStep(3);
    } finally {
      setParsing(false);
    }
  }

  async function commitDraft() {
    if (!draft || committing) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/onboarding/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone, draft }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e.error || "Could not save — try again");
        return;
      }
      setStep(4);
    } finally {
      setCommitting(false);
    }
  }

  async function sendPartnerInvite() {
    if (!partnerName.trim() || !partnerEmail.trim()) return;
    const res = await fetch("/api/onboarding/partner-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerName: partnerName.trim(), partnerEmail: partnerEmail.trim() }),
    });
    if (res.ok) {
      toast.success("Invite saved. We'll send it shortly.");
      router.push("/today");
    } else {
      toast.error("Could not send — try again");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-base flex justify-center">
      <div className="w-full max-w-md px-6 py-16 pb-32 space-y-10">
        {step === 1 && (
          <Step1
            name={name} setName={setName}
            timezone={timezone} setTimezone={setTimezone}
            onContinue={() => name.trim() && setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            goalText={goalText} setGoalText={setGoalText}
            parsing={parsing}
            onSubmit={submitGoal}
          />
        )}
        {step === 3 && draft && (
          <Step3
            draft={draft}
            setDraft={setDraft}
            committing={committing}
            onAdjustMore={() => setStep(2)}
            onLockIn={commitDraft}
          />
        )}
        {step === 4 && (
          <Step4
            onConnect={() => router.push("/settings/integrations/apple-health")}
            onLater={() => setStep(5)}
          />
        )}
        {step === 5 && (
          <Step5
            partnerName={partnerName} setPartnerName={setPartnerName}
            partnerEmail={partnerEmail} setPartnerEmail={setPartnerEmail}
            onSend={sendPartnerInvite}
            onSkip={() => router.push("/today")}
          />
        )}
      </div>
    </div>
  );
}

// ── Step 1 ───────────────────────────────────────────────────────────────────
function Step1({
  name, setName, timezone, setTimezone, onContinue,
}: {
  name: string; setName: (v: string) => void;
  timezone: string; setTimezone: (v: string) => void;
  onContinue: () => void;
}) {
  const [editingTz, setEditingTz] = useState(false);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-display-2xl font-light text-text-primary leading-tight">Hi.</h1>
        <p className="text-body-lg text-text-secondary mt-3">Quick setup. About 60 seconds.</p>
      </div>

      <div className="space-y-2">
        <label className="text-caption text-text-muted">What should I call you?</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="w-full bg-bg-surface border border-border-default rounded px-3 py-2.5 text-body text-text-primary"
          placeholder="Your first name"
        />
      </div>

      <div className="space-y-2">
        <label className="text-caption text-text-muted">Your timezone</label>
        {editingTz ? (
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            onBlur={() => setEditingTz(false)}
            autoFocus
            className="w-full bg-bg-surface border border-border-default rounded px-3 py-2.5 text-body-sm text-text-secondary font-mono"
          />
        ) : (
          <p className="text-body-sm text-text-secondary">
            Looks like <span className="font-mono">{timezone}</span>.{" "}
            <button onClick={() => setEditingTz(true)} className="text-caption text-text-muted underline underline-offset-2">
              Change
            </button>
          </p>
        )}
      </div>

      <button
        onClick={onContinue}
        disabled={!name.trim()}
        className="w-full py-3 rounded bg-champagne text-champagne-fg text-body font-medium hover:bg-champagne-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        Continue <ArrowRight size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

// ── Step 2 ───────────────────────────────────────────────────────────────────
function Step2({
  goalText, setGoalText, parsing, onSubmit,
}: {
  goalText: string; setGoalText: (v: string) => void;
  parsing: boolean;
  onSubmit: (text: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const finalRef = useRef("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const userStoppedRef = useRef(false);

  function startVoice() {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Your browser doesn't do voice — type instead.");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    finalRef.current = "";
    setInterim("");
    userStoppedRef.current = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interimSeg = "";
      let appended = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) appended += seg;
        else interimSeg += seg;
      }
      if (appended) finalRef.current = (finalRef.current + " " + appended).replace(/\s+/g, " ").trim();
      setInterim(interimSeg);
      setGoalText((finalRef.current + " " + interimSeg).trim());
    };
    rec.onend = () => {
      if (!userStoppedRef.current) {
        setTimeout(() => { try { rec.start(); } catch { /* noop */ } }, 150);
        return;
      }
      setRecording(false);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (e?.error === "no-speech" || e?.error === "aborted") return;
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        toast.error("Mic permission denied — type instead.");
        userStoppedRef.current = true;
        setRecording(false);
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Couldn't start mic — type instead.");
    }
  }

  function stopVoiceAndSubmit() {
    userStoppedRef.current = true;
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) try { rec.stop(); } catch { /* noop */ }
    setRecording(false);
    const text = (finalRef.current + " " + interim).replace(/\s+/g, " ").trim();
    if (text) onSubmit(text);
  }

  function pickChip(text: string) {
    setGoalText(text);
    onSubmit(text);
  }

  if (parsing) {
    return (
      <div className="space-y-6 pt-12">
        <h2 className="font-serif text-display-md font-light text-text-primary leading-tight">Listening to you…</h2>
        <p className="text-body-lg text-text-secondary">Reading between the lines.</p>
        <div className="flex items-center gap-2 mt-12">
          {[0, 120, 240].map((delay) => (
            <span key={delay} className="w-1.5 h-1.5 rounded-full bg-champagne animate-pulse"
              style={{ animationDelay: `${delay}ms`, animationDuration: "1.2s" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-display-xl font-light text-text-primary leading-tight">What do you actually want?</h1>
        <p className="text-body-lg text-text-secondary mt-3">Talk like you would to a friend. Or type.</p>
      </div>

      <button
        onClick={recording ? stopVoiceAndSubmit : startVoice}
        className={cn(
          "relative w-full aspect-square max-w-[180px] mx-auto rounded-full flex items-center justify-center transition-all",
          recording ? "bg-champagne/10 border-2 border-champagne" : "bg-bg-surface border-2 border-border-default hover:border-champagne/60",
        )}
        aria-label={recording ? "Stop and send" : "Start speaking"}
      >
        {recording ? (
          <>
            <span aria-hidden className="absolute inset-0 rounded-full animate-ping" style={{ boxShadow: "0 0 0 3px rgba(212,196,168,0.3)" }} />
            <Square size={32} strokeWidth={1.5} className="text-champagne relative" />
          </>
        ) : (
          <Mic size={36} strokeWidth={1.5} className="text-text-muted" />
        )}
      </button>

      {recording && (
        <p className="text-caption text-champagne text-center fu min-h-[1.5rem]">
          {goalText || "Listening — keep talking, pauses are fine."}
        </p>
      )}

      <div className="space-y-2">
        <textarea
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          rows={3}
          placeholder="Or type your goal here…"
          className="w-full bg-bg-surface border border-border-default rounded px-3 py-2.5 text-body text-text-primary resize-none"
        />
        <button
          onClick={() => goalText.trim() && onSubmit(goalText.trim())}
          disabled={!goalText.trim()}
          className="w-full py-2.5 rounded bg-champagne text-champagne-fg text-body-sm font-medium hover:bg-champagne-soft disabled:opacity-30 transition-colors"
        >
          That's it
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-caption text-text-disabled text-center">Or pick one of these</p>
        <div className="space-y-1.5">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => pickChip(chip)}
              className="w-full text-left text-body-sm text-text-secondary px-3 py-2 rounded border border-border-subtle hover:border-border-default hover:bg-bg-elevated transition-colors"
            >
              "{chip}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 3 ───────────────────────────────────────────────────────────────────
function Step3({
  draft, setDraft, committing, onAdjustMore, onLockIn,
}: {
  draft: GoalDraft;
  setDraft: (d: GoalDraft) => void;
  committing: boolean;
  onAdjustMore: () => void;
  onLockIn: () => void;
}) {
  function patchHabit(idx: number, patch: Partial<GoalDraftHabit>) {
    const next = { ...draft, habits: draft.habits.map((h, i) => i === idx ? { ...h, ...patch } : h) };
    setDraft(next);
  }
  function removeHabit(idx: number) {
    setDraft({ ...draft, habits: draft.habits.filter((_, i) => i !== idx) });
  }
  function addHabit() {
    setDraft({
      ...draft,
      habits: [
        ...draft.habits,
        { title: "New habit", cadence: "DAILY", durationMin: 10, timeOfDay: "any", points: 10 },
      ],
    });
  }
  function patchWorkout(idx: number, patch: Partial<GoalDraftWorkout>) {
    setDraft({ ...draft, workouts: draft.workouts.map((w, i) => i === idx ? { ...w, ...patch } : w) });
  }
  function removeWorkout(idx: number) {
    setDraft({ ...draft, workouts: draft.workouts.filter((_, i) => i !== idx) });
  }
  function addWorkout() {
    setDraft({ ...draft, workouts: [...draft.workouts, { workoutType: "New workout", timesPerWeek: 1 }] });
  }
  function patchMeasurement(idx: number, value: string) {
    const next = [...draft.measurements];
    next[idx] = value;
    setDraft({ ...draft, measurements: next });
  }
  function removeMeasurement(idx: number) {
    setDraft({ ...draft, measurements: draft.measurements.filter((_, i) => i !== idx) });
  }
  function addMeasurement() {
    setDraft({ ...draft, measurements: [...draft.measurements, "new_metric"] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-display-xl font-light text-text-primary leading-tight">Here's what I heard.</h1>
        <p className="text-body-sm text-text-muted mt-2">Tap anything to edit.</p>
      </div>

      <div className="space-y-5 border border-border-default bg-bg-surface rounded-md p-4">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-caption text-text-disabled uppercase tracking-widest">Goal</label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full bg-transparent border-b border-border-subtle focus:border-champagne/40 px-0 py-1 text-body font-medium text-text-primary outline-none"
          />
        </div>

        {/* Category + deadline */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-caption text-text-disabled uppercase tracking-widest">Category</label>
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as GoalCategory })}
              className="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-body-sm text-text-secondary"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-caption text-text-disabled uppercase tracking-widest">Deadline</label>
            <input
              type="date"
              value={draft.deadline ?? ""}
              onChange={(e) => setDraft({ ...draft, deadline: e.target.value || null })}
              className="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-body-sm text-text-secondary"
            />
          </div>
        </div>

        {/* Habits */}
        <div className="space-y-2 pt-3 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <label className="text-caption text-text-disabled uppercase tracking-widest">I'll track these every week</label>
            <button onClick={addHabit} className="text-text-disabled hover:text-text-secondary">
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>
          {draft.habits.map((h, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={h.title}
                  onChange={(e) => patchHabit(i, { title: e.target.value })}
                  className="w-full bg-transparent border-b border-border-subtle focus:border-champagne/40 text-body-sm text-text-secondary py-1 outline-none"
                />
                <p className="text-caption text-text-disabled">
                  {h.cadence === "DAILY" ? "Daily" : `${h.targetPerWeek ?? 3}× per week`}
                  {h.durationMin ? ` · ${h.durationMin} min` : ""}
                </p>
              </div>
              <button onClick={() => removeHabit(i)} className="p-1 text-text-disabled hover:text-terracotta" aria-label="Remove">
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>

        {/* Workouts */}
        <div className="space-y-2 pt-3 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <label className="text-caption text-text-disabled uppercase tracking-widest">Your weekly workouts</label>
            <button onClick={addWorkout} className="text-text-disabled hover:text-text-secondary">
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>
          {draft.workouts.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={w.workoutType}
                onChange={(e) => patchWorkout(i, { workoutType: e.target.value })}
                className="flex-1 bg-transparent border-b border-border-subtle focus:border-champagne/40 text-body-sm text-text-secondary py-1 outline-none"
              />
              <input
                type="number"
                min={1}
                max={7}
                value={w.timesPerWeek}
                onChange={(e) => patchWorkout(i, { timesPerWeek: parseInt(e.target.value) || 1 })}
                className="w-12 bg-bg-base border border-border-default rounded px-2 py-1 text-body-sm text-text-secondary text-center"
              />
              <span className="text-caption text-text-disabled">×/wk</span>
              <button onClick={() => removeWorkout(i)} className="p-1 text-text-disabled hover:text-terracotta" aria-label="Remove">
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>

        {/* Measurements */}
        <div className="space-y-2 pt-3 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <label className="text-caption text-text-disabled uppercase tracking-widest">I'll track these measurements</label>
            <button onClick={addMeasurement} className="text-text-disabled hover:text-text-secondary">
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.measurements.map((m, i) => (
              <div key={i} className="flex items-center gap-1 border border-border-subtle rounded-full pl-3 pr-1 py-0.5">
                <input
                  type="text"
                  value={m}
                  onChange={(e) => patchMeasurement(i, e.target.value)}
                  className="bg-transparent text-caption text-text-secondary outline-none"
                  size={Math.max(8, m.length)}
                />
                <button onClick={() => removeMeasurement(i)} className="p-0.5 text-text-disabled hover:text-terracotta">
                  <X size={10} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onAdjustMore}
          className="flex-1 py-2.5 rounded border border-border-default text-body-sm text-text-secondary hover:bg-bg-elevated"
        >
          Adjust more
        </button>
        <button
          onClick={onLockIn}
          disabled={committing}
          className="flex-1 py-2.5 rounded bg-champagne text-champagne-fg text-body-sm font-medium hover:bg-champagne-soft disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {committing ? <><Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> Saving</> : <><Check size={14} strokeWidth={1.5} /> Lock in</>}
        </button>
      </div>
    </div>
  );
}

// ── Step 4 ───────────────────────────────────────────────────────────────────
function Step4({ onConnect, onLater }: { onConnect: () => void; onLater: () => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-display-xl font-light text-text-primary leading-tight">One more thing.</h1>
        <p className="text-body-lg text-text-secondary mt-3">
          Your iPhone's data makes this work way better. Apple Health takes 90 seconds to set up. We can do it now or later.
        </p>
      </div>
      <div className="space-y-2">
        <button
          onClick={onConnect}
          className="w-full py-3 rounded bg-champagne text-champagne-fg text-body font-medium hover:bg-champagne-soft transition-colors flex items-center justify-center gap-2"
        >
          Connect now <ArrowRight size={14} strokeWidth={1.5} />
        </button>
        <button
          onClick={onLater}
          className="w-full py-3 rounded border border-border-default text-body text-text-secondary hover:bg-bg-elevated transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}

// ── Step 5 ───────────────────────────────────────────────────────────────────
function Step5({
  partnerName, setPartnerName,
  partnerEmail, setPartnerEmail,
  onSend, onSkip,
}: {
  partnerName: string; setPartnerName: (v: string) => void;
  partnerEmail: string; setPartnerEmail: (v: string) => void;
  onSend: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-display-xl font-light text-text-primary leading-tight">Last thing. Promise.</h1>
        <p className="text-body-lg text-text-secondary mt-3">
          Want one person to see your weekly progress? Just one. They get a quiet email Sunday — no feed, no leaderboard, no spam.
          The single biggest predictor of you sticking with this.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-caption text-text-muted">Their name</label>
          <input
            type="text"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            className="w-full bg-bg-surface border border-border-default rounded px-3 py-2.5 text-body text-text-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-caption text-text-muted">Their email</label>
          <input
            type="email"
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
            className="w-full bg-bg-surface border border-border-default rounded px-3 py-2.5 text-body text-text-primary"
          />
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={onSend}
          disabled={!partnerName.trim() || !partnerEmail.trim()}
          className="w-full py-3 rounded bg-champagne text-champagne-fg text-body font-medium hover:bg-champagne-soft disabled:opacity-30 transition-colors"
        >
          Send them an invite
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 rounded border border-border-default text-body text-text-secondary hover:bg-bg-elevated transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
