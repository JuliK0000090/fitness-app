"use client";

import { useEffect, useState } from "react";
import { Bell, ToggleLeft, ToggleRight, Loader2, BellRing } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";

// ── Email preferences (existing) ─────────────────────────────────────────────
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

const EMAIL_ITEMS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "morningBriefing",   label: "Morning briefing",    desc: "Daily summary at 7 AM" },
  { key: "afternoonNudge",    label: "Afternoon nudge",     desc: "If you haven't logged anything by 2 PM" },
  { key: "eveningReflection", label: "Evening reflection",  desc: "End-of-day recap" },
  { key: "weeklyReview",      label: "Weekly review",       desc: "Sunday evening email summary" },
  { key: "insightMoments",    label: "Insight moments",     desc: "Personal observations from Vita" },
];

// ── Push preferences (new) ───────────────────────────────────────────────────
type PushPrefs = {
  preWorkout: boolean;
  streakSave: boolean;
  weeklyReview: boolean;
  reactiveAdjustment: boolean;
  partnerEncouragement: boolean;
  lateDayNudge: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

const PUSH_DEFAULTS: PushPrefs = {
  preWorkout: true,
  streakSave: true,
  weeklyReview: true,
  reactiveAdjustment: true,
  partnerEncouragement: true,
  lateDayNudge: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

const PUSH_ITEMS: { key: keyof PushPrefs; label: string; desc: string }[] = [
  { key: "preWorkout",           label: "Pre-workout reminder",  desc: "30 minutes before each scheduled workout" },
  { key: "streakSave",           label: "Streak save",           desc: "8 PM nudge if you have habits left and you're on a streak" },
  { key: "weeklyReview",         label: "Sunday review",         desc: "7 PM Sunday — your week at a glance" },
  { key: "reactiveAdjustment",   label: "Plan changes",          desc: "When Vita moves a workout because of a constraint or treatment" },
  { key: "partnerEncouragement", label: "From your partner",     desc: "When your accountability partner sends you a note" },
  { key: "lateDayNudge",         label: "Late-day step reminders", desc: "10 PM ping only if you're within 25% of a wearable target" },
];

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // Allocate over a fresh ArrayBuffer so the returned array is BufferSource-compatible.
  const buffer = new ArrayBuffer(rawData.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out as Uint8Array<ArrayBuffer>;
}

export default function NotificationsPage() {
  // Email prefs (existing)
  const [emailPrefs, setEmailPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState<keyof Prefs | null>(null);

  // Push prefs (new)
  const [push, setPush] = useState<PushPrefs>(PUSH_DEFAULTS);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const [pushSaving, setPushSaving] = useState<keyof PushPrefs | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.notificationPrefs) setEmailPrefs({ ...DEFAULT_PREFS, ...data.notificationPrefs });
      })
      .catch(() => {})
      .finally(() => setEmailLoading(false));

    fetch("/api/notifications/preferences")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.preferences) setPush({ ...PUSH_DEFAULTS, ...data.preferences });
        if (data?.pushEnabled) setPushEnabled(true);
        if (data?.publicVapidKey) setVapidKey(data.publicVapidKey);
      })
      .catch(() => {})
      .finally(() => setPushLoading(false));
  }, []);

  async function toggleEmail(key: keyof Prefs) {
    const next = { ...emailPrefs, [key]: !emailPrefs[key] };
    setEmailPrefs(next);
    setEmailSaving(key);
    try {
      await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPrefs: next }),
      });
    } catch {
      setEmailPrefs(emailPrefs);
      toast.error("Could not save preference");
    } finally {
      setEmailSaving(null);
    }
  }

  async function togglePush(key: keyof PushPrefs) {
    if (key === "quietHoursStart" || key === "quietHoursEnd") return;
    const next = { ...push, [key]: !push[key as Exclude<keyof PushPrefs, "quietHoursStart" | "quietHoursEnd">] };
    setPush(next);
    setPushSaving(key);
    try {
      await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
    } catch {
      setPush(push);
      toast.error("Could not save preference");
    } finally {
      setPushSaving(null);
    }
  }

  async function patchQuietHours(field: "quietHoursStart" | "quietHoursEnd", value: string) {
    const next = { ...push, [field]: value };
    setPush(next);
    try {
      await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      toast.error("Could not save");
    }
  }

  async function enablePush() {
    if (!vapidKey) {
      toast.error("Push not configured for this server (no VAPID key).");
      return;
    }
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Your browser doesn't support push notifications.");
      return;
    }
    setSubscribing(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Notification permission denied. Enable it in browser settings.");
          return;
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: json.endpoint,
            keys: json.keys,
          },
        }),
      });
      if (!res.ok) {
        toast.error("Could not register subscription");
        return;
      }
      setPushEnabled(true);
      toast.success("Push notifications enabled");
    } catch (e) {
      console.error(e);
      toast.error("Could not enable push");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-10">
      <PageHeader
        eyebrow="Settings"
        title="Notifications"
        subtitle="Choose what Vita sends you and when."
        rule={true}
      />

      {/* ── Push notifications ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Push notifications</p>

        {!pushEnabled ? (
          <div className="border border-border-subtle bg-bg-surface rounded-md p-4 space-y-3">
            <div className="flex items-start gap-3">
              <BellRing size={14} strokeWidth={1.5} className="text-champagne mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-body-sm font-medium">Vita uses notifications sparingly.</p>
                <p className="text-caption text-text-muted mt-1">
                  At most one a day, on average. Pre-workout reminders, the occasional habit nudge,
                  and your Sunday review. Quiet hours apply automatically.
                </p>
              </div>
            </div>
            <button
              onClick={enablePush}
              disabled={subscribing || pushLoading}
              className="w-full py-2.5 rounded bg-champagne text-champagne-fg text-body-sm hover:bg-champagne-soft disabled:opacity-50 transition-colors"
            >
              {subscribing ? "Enabling…" : "Enable push notifications"}
            </button>
            <p className="text-caption text-text-disabled text-center">
              You'll be asked for permission. You can revoke any time.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border-subtle border border-border-subtle rounded-md overflow-hidden">
              {PUSH_ITEMS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center gap-4 px-4 py-3.5 bg-bg-surface">
                  <div className="w-8 h-8 rounded border border-border-default bg-bg-base flex items-center justify-center shrink-0">
                    <BellRing size={14} strokeWidth={1.5} className="text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-text-primary">{label}</p>
                    <p className="text-caption text-text-muted">{desc}</p>
                  </div>
                  {pushLoading || pushSaving === key ? (
                    <Loader2 size={18} strokeWidth={1.5} className="shrink-0 text-text-disabled animate-spin" />
                  ) : (
                    <button
                      onClick={() => togglePush(key)}
                      aria-label={`Toggle ${label}`}
                      className="shrink-0"
                    >
                      {push[key as keyof PushPrefs]
                        ? <ToggleRight size={28} strokeWidth={1.5} className="text-champagne" />
                        : <ToggleLeft size={28} strokeWidth={1.5} className="text-text-disabled" />
                      }
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="border border-border-subtle bg-bg-surface rounded-md p-4 space-y-3">
              <p className="text-body-sm font-medium">Quiet hours</p>
              <p className="text-caption text-text-muted">
                Vita won't push during these hours, in your timezone.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption text-text-disabled">From</label>
                  <input
                    type="time"
                    value={push.quietHoursStart}
                    onChange={(e) => patchQuietHours("quietHoursStart", e.target.value)}
                    className="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-body-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-caption text-text-disabled">To</label>
                  <input
                    type="time"
                    value={push.quietHoursEnd}
                    onChange={(e) => patchQuietHours("quietHoursEnd", e.target.value)}
                    className="w-full bg-bg-base border border-border-default rounded px-2 py-1.5 text-body-sm"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Email notifications (existing) ─────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">Email notifications</p>
        <div className="divide-y divide-border-subtle border border-border-subtle rounded-md overflow-hidden">
          {EMAIL_ITEMS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-4 px-4 py-3.5 bg-bg-surface">
              <div className="w-8 h-8 rounded border border-border-default bg-bg-base flex items-center justify-center shrink-0">
                <Bell size={14} strokeWidth={1.5} className="text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-text-primary">{label}</p>
                <p className="text-caption text-text-muted">{desc}</p>
              </div>
              {emailLoading || emailSaving === key ? (
                <Loader2 size={18} strokeWidth={1.5} className="shrink-0 text-text-disabled animate-spin" />
              ) : (
                <button
                  onClick={() => toggleEmail(key)}
                  aria-label={`Toggle ${label}`}
                  className="shrink-0"
                >
                  {emailPrefs[key]
                    ? <ToggleRight size={28} strokeWidth={1.5} className="text-champagne" />
                    : <ToggleLeft size={28} strokeWidth={1.5} className="text-text-disabled" />
                  }
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
