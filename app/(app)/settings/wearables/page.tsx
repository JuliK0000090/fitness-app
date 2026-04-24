"use client";

import { useEffect, useState } from "react";
import { Watch, CheckCircle, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";

const INTEGRATIONS = [
  {
    id: "apple_health",
    label: "Apple Health",
    desc: "Steps, sleep, HRV, and workouts from your iPhone",
    href: "/settings/integrations/apple-health",
  },
  { id: "garmin",     label: "Garmin",       desc: "Connect your Garmin device for activity and GPS data", href: null },
  { id: "whoop",      label: "WHOOP",        desc: "Sync recovery, strain, and sleep from WHOOP", href: null },
  { id: "oura",       label: "Oura Ring",    desc: "Readiness, sleep, and activity from Oura", href: null },
  { id: "fitbit",     label: "Fitbit",       desc: "Activity and health data from Fitbit", href: null },
  { id: "google_fit", label: "Google Fit",   desc: "Activity and health from Google Fit", href: null },
] as const;

type IntegrationId = (typeof INTEGRATIONS)[number]["id"];
type StatusMap = Partial<Record<IntegrationId, { connected: boolean; lastSync?: string }>>;

export default function WearablesPage() {
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => r.ok ? r.json() : {})
      .then((data) => setStatusMap(data as StatusMap))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Wearables"
        subtitle="Connect fitness devices to sync your health data with Vita."
        rule={true}
      />

      <div className="divide-y divide-border-subtle border border-border-subtle rounded-md overflow-hidden">
        {INTEGRATIONS.map(({ id, label, desc, href }) => {
          const status = statusMap[id];
          const connected = status?.connected ?? false;

          const inner = (
            <>
              <div className="w-8 h-8 rounded border border-border-default bg-bg-base flex items-center justify-center shrink-0">
                <Watch size={14} strokeWidth={1.5} className="text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-body-sm font-medium text-text-primary">{label}</p>
                  {loading ? (
                    <Loader2 size={11} strokeWidth={1.5} className="text-text-disabled animate-spin" />
                  ) : connected ? (
                    <CheckCircle size={11} strokeWidth={1.5} className="text-sage" />
                  ) : null}
                </div>
                <p className="text-caption text-text-muted">{desc}</p>
                {connected && status?.lastSync && (
                  <p className="text-caption text-text-disabled mt-0.5">
                    Last sync: {new Date(status.lastSync).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className={`text-caption px-2 py-0.5 rounded border shrink-0 ${
                connected
                  ? "border-sage/30 text-sage"
                  : "border-border-subtle text-text-disabled"
              }`}>
                {loading ? "…" : connected ? "Connected" : href ? "Connect" : "Soon"}
              </span>
              <ChevronRight size={13} strokeWidth={1.5} className="text-text-disabled shrink-0" />
            </>
          );

          const cls = "flex items-center gap-3 px-4 py-3.5 bg-bg-surface hover:bg-bg-elevated transition-colors";

          if (href) {
            return <Link key={id} href={href} className={cls}>{inner}</Link>;
          }

          return (
            <button
              key={id}
              onClick={() => toast.info(`${label} integration coming soon.`)}
              className={`w-full text-left ${cls}`}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
