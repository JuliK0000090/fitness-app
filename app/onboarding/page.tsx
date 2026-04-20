"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STEPS = ["Welcome", "Your body", "Your goal", "Activity", "Done"] as const;

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
  });

  function set(key: string, val: string) {
    setData((d) => ({ ...d, [key]: val }));
  }

  async function finish() {
    setLoading(true);
    try {
      // Save profile fields
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

      // Log starting weight
      if (data.currentWeightKg) {
        await fetch("/api/measurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "weight", value: parseFloat(data.currentWeightKg), unit: "kg" }),
        });
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
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="text-4xl">🌿</div>
              <h1 className="text-xl font-semibold">Welcome to Vita</h1>
              <p className="text-sm text-muted-foreground">Let's set up your profile so your coach knows how to help you best. This takes under a minute.</p>
              <Button className="w-full" onClick={() => setStep(1)}>Get started</Button>
            </div>
          )}

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
                <div className="flex gap-2">
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

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold">Activity level</h2>
              {[
                { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
                { value: "light", label: "Light", desc: "1-2 workouts/week" },
                { value: "moderate", label: "Moderate", desc: "3-4 workouts/week" },
                { value: "active", label: "Active", desc: "5+ workouts/week" },
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

          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="text-4xl">🎉</div>
              <h2 className="font-semibold">You're all set!</h2>
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
