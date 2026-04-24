"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Archetype, SkinTone, HairStyle } from "@/lib/avatar/types";
import { SKIN_TONES } from "@/lib/avatar/types";

const STEPS = [
  "Welcome",
  "Your body",
  "Your goal",
  "Activity",
  "Vita You",        // new: avatar opt-in
  "Your look",       // new: archetype + skin + hair
  "Done",
] as const;

const ARCHETYPES: { value: Archetype; label: string; desc: string }[] = [
  { value: "hourglass",         label: "Hourglass",         desc: "Balanced shoulders & hips, defined waist" },
  { value: "pear",              label: "Pear",              desc: "Hips wider than shoulders" },
  { value: "rectangle",        label: "Rectangle",         desc: "Athletic, straight through the waist" },
  { value: "inverted_triangle", label: "Inverted triangle", desc: "Shoulders wider than hips" },
  { value: "apple",            label: "Apple",             desc: "Fuller midsection" },
];

const HAIR_STYLES: { value: HairStyle; label: string }[] = [
  { value: "long_wavy",     label: "Long wavy" },
  { value: "long_straight", label: "Long straight" },
  { value: "curly_medium",  label: "Curly" },
  { value: "ponytail",      label: "Ponytail" },
  { value: "bun",           label: "Bun" },
  { value: "braids",        label: "Braids" },
  { value: "short_straight",label: "Short straight" },
  { value: "pixie",         label: "Pixie" },
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
    // avatar
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
      // Save profile
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

      // Create avatar if user opted in
      if (data.avatarVisibility !== "OFF") {
        const style = data.sensitive ? "ABSTRACT" : "ABSTRACT"; // always ABSTRACT for MVP
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
            style,
          }),
        });

        // Set safety flag if sensitive
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

  return (
    <div className="aurora-bg min-h-screen flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-2xl font-bold bg-gradient-to-r from-[#A78BFA] to-[#22D3EE] bg-clip-text text-transparent">vita</span>
          <div className="flex gap-1 justify-center mt-3">
            {STEPS.map((_, i) => (
              <span key={i} className={`w-6 h-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-secondary"}`} />
            ))}
          </div>
        </div>

        <div className="glass p-8 fu">

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <h1 className="text-xl font-semibold">Welcome to Vita</h1>
              <p className="text-sm text-muted-foreground">Let's set up your profile so your coach knows how to help you best. This takes under a minute.</p>
              <Button className="w-full" onClick={() => setStep(1)}>Get started</Button>
            </div>
          )}

          {/* Step 1 — Body */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold">Your body</h2>
              <div className="space-y-1">
                <Label>Height (cm)</Label>
                <Input type="number" placeholder="e.g. 165" value={data.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Current weight (kg)</Label>
                <Input type="number" placeholder="e.g. 65" value={data.currentWeightKg} onChange={(e) => set("currentWeightKg", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Sex</Label>
                <div className="flex gap-2 flex-wrap">
                  {["Female", "Male", "Non-binary", "Prefer not to say"].map((s) => (
                    <button key={s} onClick={() => set("sex", s.toLowerCase())}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${data.sex === s.toLowerCase() ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(2)} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {/* Step 2 — Goal */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold">Your goal</h2>
              <div className="space-y-1">
                <Label>Goal weight (kg, optional)</Label>
                <Input type="number" placeholder="e.g. 60" value={data.goalWeightKg} onChange={(e) => set("goalWeightKg", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Primary goal</Label>
                {["Lose fat", "Build muscle", "Improve fitness", "Maintain"].map((g) => (
                  <button key={g} onClick={() => set("primaryGoal", g)}
                    className={`w-full text-left text-sm px-4 py-2.5 rounded-xl border transition-colors ${data.primaryGoal === g ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground glass-hover"}`}>
                    {g}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {/* Step 3 — Activity */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold">Activity level</h2>
              {[
                { value: "sedentary",   label: "Sedentary",   desc: "Little or no exercise" },
                { value: "light",       label: "Light",       desc: "1–2 workouts/week" },
                { value: "moderate",    label: "Moderate",    desc: "3–4 workouts/week" },
                { value: "active",      label: "Active",      desc: "5+ workouts/week" },
                { value: "very_active", label: "Very active", desc: "Athlete / physical job" },
              ].map((a) => (
                <button key={a.value} onClick={() => set("activityLevel", a.value)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border transition-colors ${data.activityLevel === a.value ? "border-primary bg-primary/10" : "border-border glass-hover"}`}>
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </button>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(4)} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {/* Step 4 — Avatar opt-in + sensitivity */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold">Vita You</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  A stylized illustrated companion that evolves forward through your goal journey. Never realistic. Never a before/after.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { value: "ON",      label: "Yes, show it",    desc: "Avatar appears in your body page and weekly review" },
                  { value: "LIMITED", label: "Body page only",  desc: "Avatar stays on /body, not in weekly review" },
                  { value: "OFF",     label: "No thanks",       desc: "Skip the avatar entirely" },
                ].map((opt) => (
                  <button key={opt.value} onClick={() => set("avatarVisibility", opt.value as "ON" | "LIMITED" | "OFF")}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border transition-colors ${data.avatarVisibility === opt.value ? "border-primary bg-primary/10" : "border-border glass-hover"}`}>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {data.avatarVisibility !== "OFF" && (
                <div className="border border-white/[0.06] rounded-xl p-4 space-y-2">
                  <p className="text-xs text-white/60">
                    If you've ever had a difficult relationship with food or body image, Vita can start with the most abstract, silhouette-only style and keep the avatar off your main screens.
                  </p>
                  <button
                    onClick={() => set("sensitive", !data.sensitive)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${data.sensitive ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-white/40"}`}
                  >
                    {data.sensitive ? "Yes, use the abstract style" : "I'd like the abstract style"}
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(data.avatarVisibility === "OFF" ? 6 : 5)} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {/* Step 5 — Look (archetype + skin + hair) */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold">Your look</h2>
                <p className="text-sm text-muted-foreground mt-1">Pick what feels closest to you. You can change this any time.</p>
              </div>

              {/* Archetype */}
              <div className="space-y-1.5">
                <Label className="text-[10px] tracking-wider uppercase text-white/40">Body shape</Label>
                {ARCHETYPES.map((a) => (
                  <button key={a.value} onClick={() => set("archetype", a.value)}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${data.archetype === a.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground glass-hover"}`}>
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs opacity-60">{a.desc}</p>
                  </button>
                ))}
              </div>

              {/* Skin tone */}
              <div className="space-y-2">
                <Label className="text-[10px] tracking-wider uppercase text-white/40">Skin tone</Label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(SKIN_TONES) as [string, string][]).map(([tone, hex]) => {
                    const toneNum = parseInt(tone) as SkinTone;
                    return (
                      <button key={tone} onClick={() => set("skinTone", toneNum)}
                        className={`w-9 h-9 rounded-full border-2 transition-all ${data.skinTone === toneNum ? "border-primary scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: hex }} aria-label={`Tone ${tone}`} />
                    );
                  })}
                </div>
              </div>

              {/* Hair style */}
              <div className="space-y-2">
                <Label className="text-[10px] tracking-wider uppercase text-white/40">Hair style</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {HAIR_STYLES.map((h) => (
                    <button key={h.value} onClick={() => set("hairStyle", h.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${data.hairStyle === h.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(6)} className="flex-1">Next</Button>
              </div>
            </div>
          )}

          {/* Step 6 — Done */}
          {step === 6 && (
            <div className="text-center space-y-4">
              <h2 className="font-semibold">You're all set</h2>
              <p className="text-sm text-muted-foreground">Vita is ready to coach you. Start by telling your coach your first goal or asking for today's plan.</p>
              <Button className="w-full" onClick={finish} disabled={loading}>
                {loading ? "Setting up…" : "Start coaching"}
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
