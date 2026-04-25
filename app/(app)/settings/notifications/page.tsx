"use client";

import { useEffect, useState } from "react";
import { Bell, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";

type Prefs = {
  morningBriefing: boolean;
  afternoonNudge: boolean;
  eveningReflection: boolean;
  weeklyReview: boolean;
  insightMoments: boolean;
};

const DEFAULT_PREFS: Prefs = {
  morningBriefing: true,
  afternoonNudge: true,
  eveningReflection: false,
  weeklyReview: true,
  insightMoments: true,
};

const ITEMS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "morningBriefing",   label: "Morning briefing",    desc: "Daily summary at 7 AM — readiness, today's plan, streak" },
  { key: "afternoonNudge",    label: "Afternoon nudge",     desc: "A gentle check-in if you haven't logged anything by 2 PM" },
  { key: "eveningReflection", label: "Evening reflection",  desc: "End-of-day recap of habits completed and tomorrow's plan" },
  { key: "weeklyReview",      label: "Weekly review",       desc: "Sunday evening summary of the week's outcomes" },
  { key: "insightMoments",    label: "Insight moments",     desc: "Personalized observations when Vita notices something worth flagging" },
];

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof Prefs | null>(null);

  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.notificationPrefs) {
          setPrefs({ ...DEFAULT_PREFS, ...data.notificationPrefs });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(key);
    try {
      await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPrefs: next }),
      });
    } catch {
      setPrefs(prefs); // revert
      toast.error("Could not save preference");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Notifications"
        subtitle="Choose what Vita sends you and when."
        rule={true}
      />

      <div className="divide-y divide-border-subtle border border-border-subtle rounded-md overflow-hidden">
        {ITEMS.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center gap-4 px-4 py-3.5 bg-bg-surface">
            <div className="w-8 h-8 rounded border border-border-default bg-bg-base flex items-center justify-center shrink-0">
              <Bell size={14} strokeWidth={1.5} className="text-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-text-primary">{label}</p>
              <p className="text-caption text-text-muted">{desc}</p>
            </div>
            {loading || saving === key ? (
              <Loader2 size={18} strokeWidth={1.5} className="shrink-0 text-text-disabled animate-spin" />
            ) : (
              <button
                onClick={() => toggle(key)}
                aria-label={`Toggle ${label}`}
                className="shrink-0"
              >
                {prefs[key]
                  ? <ToggleRight size={28} strokeWidth={1.5} className="text-champagne" />
                  : <ToggleLeft size={28} strokeWidth={1.5} className="text-text-disabled" />
                }
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-caption text-text-disabled">
        Notifications are delivered via email. Push notifications are coming in a future update.
      </p>
    </div>
  );
}
