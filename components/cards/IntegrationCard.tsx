"use client";

import { useState } from "react";
import { Watch, Wifi, WifiOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface IntegrationCardProps {
  provider: string; // "apple_health" | "google_fit" | "garmin" | "whoop" | "oura"
  connected: boolean;
  lastSynced?: string;
  metrics?: string[];
}

const PROVIDER_LABELS: Record<string, string> = {
  apple_health: "Apple Health",
  google_fit: "Google Fit",
  garmin: "Garmin",
  whoop: "WHOOP",
  oura: "Oura Ring",
  fitbit: "Fitbit",
};

export function IntegrationCard({ provider, connected, lastSynced, metrics = [] }: IntegrationCardProps) {
  const [status, setStatus] = useState<"idle" | "connecting">("idle");
  const [isConnected, setIsConnected] = useState(connected);
  const label = PROVIDER_LABELS[provider] ?? provider;

  async function connect() {
    setStatus("connecting");
    try {
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        const data = await res.json() as { url?: string; redirectUrl?: string };
        const target = data.url ?? data.redirectUrl;
        if (target) window.location.href = target;
        else { setIsConnected(true); toast.success(`${label} connected!`); }
      } else {
        toast.error("Connection failed");
      }
    } catch {
      toast.error("Connection failed");
    } finally {
      setStatus("idle");
    }
  }

  async function disconnect() {
    await fetch("/api/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    setIsConnected(false);
    toast.success(`${label} disconnected`);
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-white/[0.07]">
      <div className="flex items-center gap-2">
        <div className="border border-white/[0.07] w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
          <Watch size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{label}</p>
          {lastSynced && isConnected && (
            <p className="text-[10px] text-muted-foreground">Last synced: {lastSynced}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isConnected
            ? <Wifi size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
            : <WifiOff size={14} className="text-muted-foreground" />
          }
          <span className="text-[10px]" style={{ color: isConnected ? "rgba(255,255,255,0.5)" : undefined }}>
            {isConnected ? "Connected" : "Not connected"}
          </span>
        </div>
      </div>

      {metrics.length > 0 && isConnected && (
        <div className="flex flex-wrap gap-1">
          {metrics.map((m) => (
            <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{m}</span>
          ))}
        </div>
      )}

      <button
        onClick={isConnected ? disconnect : connect}
        disabled={status === "connecting"}
        className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-colors"
        style={isConnected
          ? { background: "rgba(255,255,255,0.04)", color: "var(--muted-foreground)" }
          : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }
        }
      >
        {status === "connecting" && <Loader2 size={12} className="animate-spin" />}
        {isConnected ? "Disconnect" : `Connect ${label}`}
      </button>
    </div>
  );
}
