"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, RefreshCw, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  { id: "APPLE", label: "Apple Health", note: "Requires companion app" },
  { id: "OURA", label: "Oura Ring" },
  { id: "WHOOP", label: "Whoop" },
  { id: "FITBIT", label: "Fitbit" },
  { id: "GARMIN", label: "Garmin" },
  { id: "WITHINGS", label: "Withings" },
  { id: "POLAR", label: "Polar" },
  { id: "SAMSUNG", label: "Samsung Health" },
  { id: "STRAVA", label: "Strava" },
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
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1">Connected devices</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Connect your wearables so Vita can see your steps, sleep, and recovery automatically.
      </p>

      <div className="glass rounded-2xl px-4 py-4 mb-6 text-sm text-muted-foreground">
        Wearable integrations are coming soon. You&apos;ll be able to connect Oura, Whoop, Garmin, Fitbit, and more.
      </div>

      <div className="space-y-3 opacity-50 pointer-events-none select-none">
        {PROVIDERS.map(({ id, label, note }) => {
          const device = deviceMap[id];
          const connected = device?.connected === true && device?.status !== "DISCONNECTED";

          return (
            <div key={id} className="glass rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {connected
                  ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  : <Circle size={16} className="text-muted-foreground/40 shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  {connected && device.lastSyncAt && (
                    <p className="text-[10px] text-muted-foreground">
                      Last sync {new Date(device.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                  {note && !connected && (
                    <p className="text-[10px] text-muted-foreground">{note}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {connected ? (
                  <>
                    <button
                      onClick={() => backfill(device)}
                      disabled={!!loading}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                      title="Sync last 90 days"
                    >
                      <RefreshCw size={13} className={cn(loading === "backfill-" + device.id && "animate-spin")} />
                    </button>
                    <button
                      onClick={() => disconnect(device)}
                      disabled={!!loading}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary"
                      title="Disconnect"
                    >
                      <Unlink size={13} />
                    </button>
                  </>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground">
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
