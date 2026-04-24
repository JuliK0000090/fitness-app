"use client";

import { useEffect, useState } from "react";
import { Watch, CheckCircle, XCircle, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const INTEGRATIONS = [
  {
    id: "apple_health",
    label: "Apple Health",
    desc: "Sync activity, workouts, and health data from Apple Health",
    href: "/settings/integrations/apple-health",
  },
  {
    id: "garmin",
    label: "Garmin",
    desc: "Connect your Garmin device for activity and GPS data",
    href: null,
  },
  {
    id: "whoop",
    label: "WHOOP",
    desc: "Sync recovery, strain, and sleep data from WHOOP",
    href: null,
  },
  {
    id: "oura",
    label: "Oura Ring",
    desc: "Sync readiness, sleep, and activity data from Oura",
    href: null,
  },
  {
    id: "fitbit",
    label: "Fitbit",
    desc: "Connect your Fitbit device for activity and health data",
    href: null,
  },
  {
    id: "google_fit",
    label: "Google Fit",
    desc: "Sync activity and health data from Google Fit",
    href: null,
  },
] as const;

type IntegrationId = (typeof INTEGRATIONS)[number]["id"];

interface IntegrationStatus {
  connected: boolean;
  lastSync?: string;
}

type StatusMap = Partial<Record<IntegrationId, IntegrationStatus>>;

function IntegrationCard({
  id,
  label,
  desc,
  href,
  status,
  loading,
}: {
  id: IntegrationId;
  label: string;
  desc: string;
  href: string | null;
  status: IntegrationStatus | undefined;
  loading: boolean;
}) {
  const connected = status?.connected ?? false;

  const inner = (
    <>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: connected ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.04)" }}
      >
        <Watch size={16} style={{ color: connected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {loading ? (
            <Loader2 size={12} className="text-muted-foreground animate-spin" />
          ) : connected ? (
            <CheckCircle size={12} className="text-emerald-400" />
          ) : (
            <XCircle size={12} className="text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
        {connected && status?.lastSync && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Last sync: {new Date(status.lastSync).toLocaleDateString()}
          </p>
        )}
      </div>
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
          connected
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-white/5 text-muted-foreground"
        }`}
      >
        {loading ? "..." : connected ? "Connected" : "Disconnected"}
      </span>
      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
    </>
  );

  const className = "glass rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      onClick={() => toast.info(`${label} integration coming soon.`)}
      className={`w-full text-left ${className}`}
    >
      {inner}
    </button>
  );
}

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
    <div className="max-w-lg mx-auto py-6 px-4 space-y-2">
      <div className="mb-6">
        <h1 className="text-lg font-bold">Wearables</h1>
        <p className="text-xs text-muted-foreground">
          Connect fitness devices to sync your health data with Vita
        </p>
      </div>

      {INTEGRATIONS.map(({ id, label, desc, href }) => (
        <IntegrationCard
          key={id}
          id={id}
          label={label}
          desc={desc}
          href={href}
          status={statusMap[id]}
          loading={loading}
        />
      ))}
    </div>
  );
}
