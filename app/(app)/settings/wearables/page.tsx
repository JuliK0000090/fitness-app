"use client";

import { useEffect, useState } from "react";
import { Watch, CheckCircle, XCircle, Loader2 } from "lucide-react";

const INTEGRATIONS = [
  { id: "apple_health", label: "Apple Health", desc: "Sync activity, workouts, and health data from Apple Health" },
  { id: "garmin", label: "Garmin", desc: "Connect your Garmin device for activity and GPS data" },
  { id: "whoop", label: "WHOOP", desc: "Sync recovery, strain, and sleep data from WHOOP" },
  { id: "oura", label: "Oura Ring", desc: "Sync readiness, sleep, and activity data from Oura" },
  { id: "fitbit", label: "Fitbit", desc: "Connect your Fitbit device for activity and health data" },
  { id: "google_fit", label: "Google Fit", desc: "Sync activity and health data from Google Fit" },
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
  status,
  loading,
}: {
  id: IntegrationId;
  label: string;
  desc: string;
  status: IntegrationStatus | undefined;
  loading: boolean;
}) {
  const connected = status?.connected ?? false;

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: connected ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.04)" }}
      >
        <Watch size={16} style={{ color: connected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)" }} />
      </div>
      <div className="flex-1">
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
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          connected
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-white/5 text-muted-foreground"
        }`}
      >
        {loading ? "..." : connected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}

export default function WearablesPage() {
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/integrations/status");
        if (!res.ok) throw new Error(`Failed to fetch status: ${res.status}`);
        const data = await res.json();
        setStatusMap(data as StatusMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load integration status");
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  return (
    <div className="max-w-lg mx-auto py-6 px-4 space-y-2">
      <div className="mb-6">
        <h1 className="text-lg font-bold">Wearables</h1>
        <p className="text-xs text-muted-foreground">
          Connect fitness devices to sync your health data with Vita
        </p>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {INTEGRATIONS.map(({ id, label, desc }) => (
        <IntegrationCard
          key={id}
          id={id}
          label={label}
          desc={desc}
          status={statusMap[id]}
          loading={loading}
        />
      ))}
    </div>
  );
}
