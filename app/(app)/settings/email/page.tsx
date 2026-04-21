"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

const PREFERENCES = [
  { key: "dailyMorningPlan", label: "Morning plan", description: "Today's workout, habits, and one note from Vita. Daily." },
  { key: "tomorrowEvening", label: "Tomorrow's plan", description: "An evening preview of what's coming tomorrow. Opt-in." },
  { key: "weeklyReview", label: "Weekly review", description: "Your numbers from the week, what I noticed, what changes next." },
  { key: "monthlyReport", label: "Monthly report", description: "Goals, wins, and an honest reflection. First of each month." },
  { key: "workoutReminders", label: "Workout reminders", description: "A nudge 30 minutes before a scheduled session." },
  { key: "measurementNudges", label: "Measurement nudges", description: "Reminders to take your weekly measurements." },
  { key: "photoNudges", label: "Progress photo nudges", description: "Biweekly reminders to take a progress photo." },
  { key: "milestones", label: "Milestones & streaks", description: "When you hit a streak or reach a goal." },
  { key: "winback", label: "Win-back messages", description: "A quiet check-in if you've been away a while." },
  { key: "birthday", label: "Birthday", description: "One email. No promotion." },
  { key: "onboardingSeries", label: "Onboarding series", description: "The first two weeks of emails that show you the system." },
] as const;

type PrefKey = typeof PREFERENCES[number]["key"];
type Prefs = Record<PrefKey, boolean> & { morningTime: string; eveningTime: string; timezone: string };

export default function EmailSettingsPage() {
  const [prefs, setPrefs] = useState<Partial<Prefs>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/email").then((r) => r.json()).then((d) => { setPrefs(d); setLoading(false); });
  }, []);

  async function update(key: string, value: boolean | string) {
    setPrefs((p) => ({ ...p, [key]: value }));
    const res = await fetch("/api/settings/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (!res.ok) toast.error("Couldn't save preference");
  }

  async function unsubscribeAll() {
    const updates = Object.fromEntries(PREFERENCES.map((p) => [p.key, false]));
    setPrefs((prev) => ({ ...prev, ...updates }));
    await fetch("/api/settings/email", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    toast.success("Unsubscribed from all non-essential emails.");
  }

  if (loading) return <div className="p-6 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1">Email preferences</h1>
      <p className="text-sm text-muted-foreground mb-8">Transactional emails (security, account changes) are always sent.</p>

      <div className="space-y-4">
        {PREFERENCES.map(({ key, label, description }) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <button
              role="switch"
              aria-checked={!!prefs[key]}
              onClick={() => update(key, !prefs[key])}
              className={`shrink-0 w-10 h-6 rounded-full transition-colors ${prefs[key] ? "bg-primary" : "bg-muted"} relative`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${prefs[key] ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Morning send time</label>
            <input type="time" value={prefs.morningTime ?? "07:00"} onChange={(e) => update("morningTime", e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Evening send time</label>
            <input type="time" value={prefs.eveningTime ?? "20:00"} onChange={(e) => update("eveningTime", e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <button onClick={unsubscribeAll} className="mt-10 text-xs text-muted-foreground underline">
        Unsubscribe from all non-essential emails
      </button>
    </div>
  );
}
