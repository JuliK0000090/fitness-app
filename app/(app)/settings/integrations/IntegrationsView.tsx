"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, RefreshCw, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

const PROVIDERS = [
  { id: "APPLE",      label: "Apple Health",    note: "Requires companion app" },
  { id: "OURA",       label: "Oura Ring" },
  { id: "WHOOP",      label: "Whoop" },
  { id: "FITBIT",     label: "Fitbit" },
  { id: "GARMIN",     label: "Garmin" },
  { id: "WITHINGS",   label: "Withings" },
  { id: "POLAR",      label: "Polar" },
  { id: "SAMSUNG",    label: "Samsung Health" },
  { id: "STRAVA",     label: "Strava" },
  { id: "GOOGLE_FIT", label: "Google Fit" },
];

interface Device {
  id: string;
  provider: string;
  status: string;
  connected: boolean;
  lastSyncAt: Date | null;
  terraUserId: string | null;
}

export function IntegrationsView({ devices }: { devices: Device[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  const deviceMap = Object.fromEntries(devices.map((d) => [d.provider, d]));

  async function disconnect(device: Device) {
    setLoading(device.id);
    try {
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: device.provider }),
      });
      if (!res.ok) throw new Error("Disconnect failed");
      toast.success("Disconnected");
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setLoading(null);
    }
  }

  async function backfill(device: Device) {
    setLoading("backfill-" + device.id);
    try {
      await fetch("/api/health/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terraUserId: device.terraUserId, provider: device.provider }),
      });
      toast.success("Backfill started — pulling last 90 days…");
    } catch {
      toast.error("Backfill failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Connected devices"
        subtitle="Connect your wearables so Vita can see your steps, sleep, and recovery automatically."
        rule={true}
      />

      <div className="border border-border-subtle bg-bg-surface rounded-md px-4 py-3 text-caption text-text-muted">
        Wearable integrations are coming soon. You'll be able to connect Oura, Whoop, Garmin, Fitbit, and more.
      </div>

      <div className="divide-y divide-border-subtle border border-border-subtle rounded-md overflow-hidden">
        {PROVIDERS.map(({ id, label, note }) => {
          const device = deviceMap[id];
          const connected = device?.connected === true && device?.status !== "DISCONNECTED";

          return (
            <div key={id} className={cn("flex items-center justify-between gap-3 px-4 py-3 bg-bg-surface", !connected && "opacity-50 pointer-events-none select-none")}>
              <div className="flex items-center gap-3">
                {connected
                  ? <CheckCircle2 size={14} strokeWidth={1.5} className="text-sage shrink-0" />
                  : <Circle size={14} strokeWidth={1.5} className="text-text-disabled shrink-0" />
                }
                <div>
                  <p className="text-body-sm font-medium text-text-primary">{label}</p>
                  {connected && device.lastSyncAt && (
                    <p className="text-caption text-text-disabled">
                      Last sync {new Date(device.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                  {note && !connected && (
                    <p className="text-caption text-text-disabled">{note}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {connected ? (
                  <>
                    <button
                      onClick={() => backfill(device)}
                      disabled={!!loading}
                      className="p-1.5 rounded border border-border-subtle text-text-disabled hover:text-text-muted hover:border-border-default transition-colors"
                      title="Sync last 90 days"
                    >
                      <RefreshCw size={12} strokeWidth={1.5} className={cn(loading === "backfill-" + device.id && "animate-spin")} />
                    </button>
                    <button
                      onClick={() => disconnect(device)}
                      disabled={!!loading}
                      className="p-1.5 rounded border border-border-subtle text-text-disabled hover:text-terracotta hover:border-terracotta/30 transition-colors"
                      title="Disconnect"
                    >
                      <Unlink size={12} strokeWidth={1.5} />
                    </button>
                  </>
                ) : (
                  <span className="text-caption px-2.5 py-1 rounded border border-border-subtle text-text-disabled">
                    Soon
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
