"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VitaWordmark } from "@/components/ui/VitaWordmark";
import type { Archetype, SkinTone, HairStyle } from "@/lib/avatar/types";
import { SKIN_TONES } from "@/lib/avatar/types";

const STEPS = ["Welcome", "Your body", "Your goal", "Activity", "Vita You", "Your look", "Done"] as const;

const ARCHETYPES: { value: Archetype; label: string; desc: string }[] = [
  { value: "hourglass",         label: "Hourglass",         desc: "Balanced shoulders & hips, defined waist" },
  { value: "pear",              label: "Pear",              desc: "Hips wider than shoulders" },
  { value: "rectangle",        label: "Rectangle",         desc: "Athletic, straight through the waist" },
  { value: "inverted_triangle", label: "Inverted triangle", desc: "Shoulders wider than hips" },
  { value: "apple",            label: "Apple",             desc: "Fuller midsection" },
];

const HAIR_STYLES: { value: HairStyle; label: string }[] = [
  { value: "long_wavy",      label: "Long wavy" },
  { value: "long_straight",  label: "Long straight" },
  { value: "curly_medium",   label: "Curly" },
  { value: "ponytail",       label: "Ponytail" },
  { value: "bun",            label: "Bun" },
  { value: "braids",         label: "Braids" },
  { value: "short_straight", label: "Short straight" },
  { value: "pixie",          label: "Pixie" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    heightCm: "",
    currentWeightKg: "",
    goalWeightKg: "",
    sex: "",
    activityLevel: "",
    primaryGoal: "",
    avatarVisibility: "ON" as "ON" | "LIMITED" | "OFF",
    archetype: "rectangle" as Archetype,
    skinTone: 3 as SkinTone,
    hairStyle: "long_wavy" as HairStyle,
    sensitive: false,
  });

  function set<K extends keyof typeof data>(key: K, val: (typeof data)[K]) {
    setData((d) => ({ ...d, [key]: val }));
  }

  async function finish() {
    setLoading(true);
    try {
      await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm: data.heightCm ? parseFloat(data.heightCm) : undefined,
          goalWeightKg: data.goalWeightKg ? parseFloat(data.goalWeightKg) : undefined,
          sex: data.sex || undefined,
          activityLevel: data.activityLevel || undefined,
          onboardingComplete: true,
        }),
      });

      if (data.currentWeightKg) {
        await fetch("/api/measurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "weight", value: parseFloat(data.currentWeightKg), unit: "kg" }),
        });
      }

      if (data.avatarVisibility !== "OFF") {
        const visibility = data.sensitive ? "LIMITED" : data.avatarVisibility;
        await fetch("/api/avatar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            definition: {
              archetype: data.archetype,
              skinTone: data.skinTone,
              hairStyle: data.hairStyle,
              hairColor: "brown",
              height: "medium",
              frame: "medium",
              outfit: "activewear_set",
              pose: "hands_on_hips",
              background: "studio",
              accessories: [],
              evolution: 0,
              glow: 1,
            },
            visibility,
            style: "ABSTRACT",
          }),
        });

        if (data.sensitive) {
          await fetch("/api/avatar/safety-flag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              flag: "sensitive_body_image",
              setBy: "onboarding",
              note: "User indicated history of difficult relationship with body image during onboarding",
            }),
          });
        }
      }

      router.push("/today");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const totalSteps = STEPS.length;

  return (
    <div className="bg-bg-base min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-10">

        {/* Wordmark + progress */}
        <div className="space-y-6">
          <VitaWordmark size="lg" className="text-text-primary" />

          {/* Progress bar */}
          <div className="w-full h-px bg-border-subtle relative overflow-hidden rounded-full">
            <div
              className="absolute inset-y-0 left-0 bg-champagne transition-all duration-500"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <p className="text-caption text-text-disabled text-center">
            {step + 1} of {totalSteps} — {STEPS[step]}
          </p>
        </div>

        {/* Step panel */}
        <div className="border border-border-subtle bg-bg-surface rounded-md p-8">

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="font-serif text-heading-lg font-light text-text-primary">Welcome to Vita</h1>
                <p className="text-caption text-text-muted leading-relaxed">
                  Let's set up your profile so your coach knows how to help you best. This takes under a minute.
                </p>
              </div>
              <Button variant="primary" className="w-full" onClick={() => setStep(1)}>
                Get started
              </Button>
            </div>
          )}

          {/* Step 1 — Body */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-serif text-heading-lg font-light text-text-primary">Your body</h2>
                <p className="text-caption text-text-muted">Used to calculate calorie and protein targets accurately.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-caption text-text-muted">Height (cm)</label>
                  <Input type="number" placeholder="e.g. 165" value={data.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-caption text-text-muted">Current weight (kg)</label>
                  <Input type="number" placeholder="e.g. 65" value={data.currentWeightKg} onChange={(e) => set("currentWeightKg", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-caption text-text-muted">Sex</label>
                  <div className="flex gap-2 flex-wrap">
                    {["Female", "Male", "Non-binary", "Prefer not to say"].map((s) => (
                      <button
                        key={s}
                        onClick={() => set("sex", s.toLowerCase())}
                        className={cn(
                          "text-caption px-3 py-1.5 rounded border transition-colors",
                          data.sex === s.toLowerCase()
                            ? "border-champagne/50 bg-champagne/10 text-champagne"
                            : "border-border-subtle text-text-disabled hover:border-border-default hover:text-text-muted"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">Back</Button>
                <Button variant="primary" onClick={() => setStep(2)} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {/* Step 2 — Goal */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-serif text-heading-lg font-light text-text-primary">Your goal</h2>
                <p className="text-caption text-text-muted">Vita adapts your plan as your goal evolves.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-caption text-text-muted">Goal weight (kg, optional)</label>
                  <Input type="number" placeholder="e.g. 60" value={data.goalWeightKg} onChange={(e) => set("goalWeightKg", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-caption text-text-muted">Primary goal</label>
                  {["Lose fat", "Build muscle", "Improve fitness", "Maintain"].map((g) => (
                    <button
                      key={g}
                      onClick={() => set("primaryGoal", g)}
                      className={cn(
                        "w-full text-left text-body-sm px-4 py-3 rounded border transition-colors",
                        data.primaryGoal === g
                          ? "border-champagne/50 bg-champagne/10 text-text-primary"
                          : "border-border-subtle text-text-muted hover:border-border-default"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button variant="primary" onClick={() => setStep(3)} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {/* Step 3 — Activity */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-serif text-heading-lg font-light text-text-primary">Activity level</h2>
                <p className="text-caption text-text-muted">Used to calculate your maintenance calories.</p>
              </div>
              <div className="space-y-2">
                {[
                  { value: "sedentary",   label: "Sedentary",    desc: "Little or no exercise" },
                  { value: "light",       label: "Light",        desc: "1–2 workouts per week" },
                  { value: "moderate",    label: "Moderate",     desc: "3–4 workouts per week" },
                  { value: "active",      label: "Active",       desc: "5+ workouts per week" },
                  { value: "very_active", label: "Very active",  desc: "Athlete or physical job" },
                ].map((a) => (
                  <button
                    key={a.value}
                    onClick={() => set("activityLevel", a.value)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded border transition-colors",
                      data.activityLevel === a.value
                        ? "border-champagne/50 bg-champagne/10"
                        : "border-border-subtle hover:border-border-default"
                    )}
                  >
                    <p className={cn("text-body-sm font-medium", data.activityLevel === a.value ? "text-text-primary" : "text-text-secondary")}>{a.label}</p>
                    <p className="text-caption text-text-muted">{a.desc}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button variant="primary" onClick={() => setStep(4)} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {/* Step 4 — Avatar opt-in */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-serif text-heading-lg font-light text-text-primary">Vita You</h2>
                <p className="text-caption text-text-muted leading-relaxed">
                  A stylized illustrated companion that evolves as you progress toward your goals. Never realistic. Never a before/after.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { value: "ON",      label: "Yes, show it",   desc: "Appears in your body page and weekly review" },
                  { value: "LIMITED", label: "Body page only", desc: "Stays on /body, not in weekly review" },
                  { value: "OFF",     label: "No thanks",      desc: "Skip the avatar entirely" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set("avatarVisibility", opt.value as "ON" | "LIMITED" | "OFF")}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded border transition-colors",
                      data.avatarVisibility === opt.value
                        ? "border-champagne/50 bg-champagne/10"
                        : "border-border-subtle hover:border-border-default"
                    )}
                  >
                    <p className={cn("text-body-sm font-medium", data.avatarVisibility === opt.value ? "text-text-primary" : "text-text-secondary")}>{opt.label}</p>
                    <p className="text-caption text-text-muted">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {data.avatarVisibility !== "OFF" && (
                <div className="border border-border-subtle rounded p-4 space-y-3">
                  <p className="text-caption text-text-muted leading-relaxed">
                    If you've ever had a difficult relationship with food or body image, Vita can use the most abstract style and keep the avatar off your main screens.
                  </p>
                  <button
                    onClick={() => set("sensitive", !data.sensitive)}
                    className={cn(
                      "text-caption px-3 py-1.5 rounded border transition-colors",
                      data.sensitive
                        ? "border-champagne/50 bg-champagne/10 text-champagne"
                        : "border-border-subtle text-text-disabled hover:border-border-default"
                    )}
                  >
                    {data.sensitive ? "Using abstract style" : "Use the abstract style"}
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(3)} className="flex-1">Back</Button>
                <Button variant="primary" onClick={() => setStep(data.avatarVisibility === "OFF" ? 6 : 5)} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {/* Step 5 — Look */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-serif text-heading-lg font-light text-text-primary">Your look</h2>
                <p className="text-caption text-text-muted">Pick what feels closest. You can change this any time.</p>
              </div>

              {/* Archetype */}
              <div className="space-y-2">
                <label className="text-caption text-text-disabled uppercase tracking-widest">Body shape</label>
                {ARCHETYPES.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => set("archetype", a.value)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded border transition-colors",
                      data.archetype === a.value
                        ? "border-champagne/50 bg-champagne/10"
                        : "border-border-subtle hover:border-border-default"
                    )}
                  >
                    <p className={cn("text-body-sm font-medium", data.archetype === a.value ? "text-text-primary" : "text-text-secondary")}>{a.label}</p>
                    <p className="text-caption text-text-muted">{a.desc}</p>
                  </button>
                ))}
              </div>

              {/* Skin tone */}
              <div className="space-y-2">
                <label className="text-caption text-text-disabled uppercase tracking-widest">Skin tone</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(SKIN_TONES) as [string, string][]).map(([tone, hex]) => {
                    const toneNum = parseInt(tone) as SkinTone;
                    return (
                      <button
                        key={tone}
                        onClick={() => set("skinTone", toneNum)}
                        className={cn(
                          "w-9 h-9 rounded-full border-2 transition-all",
                          data.skinTone === toneNum ? "border-champagne scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: hex }}
                        aria-label={`Tone ${tone}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Hair style */}
              <div className="space-y-2">
                <label className="text-caption text-text-disabled uppercase tracking-widest">Hair style</label>
                <div className="flex gap-1.5 flex-wrap">
                  {HAIR_STYLES.map((h) => (
                    <button
                      key={h.value}
                      onClick={() => set("hairStyle", h.value)}
                      className={cn(
                        "text-caption px-3 py-1.5 rounded border transition-colors",
                        data.hairStyle === h.value
                          ? "border-champagne/50 bg-champagne/10 text-champagne"
                          : "border-border-subtle text-text-disabled hover:border-border-default hover:text-text-muted"
                      )}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(4)} className="flex-1">Back</Button>
                <Button variant="primary" onClick={() => setStep(6)} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {/* Step 6 — Done */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-serif text-heading-lg font-light text-text-primary">You're all set</h2>
                <p className="text-caption text-text-muted leading-relaxed">
                  Vita is ready to coach you. Start by sharing your first goal or asking for today's plan.
                </p>
              </div>
              <Button variant="primary" className="w-full" onClick={finish} disabled={loading}>
                {loading ? "Setting up…" : "Start coaching"}
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
