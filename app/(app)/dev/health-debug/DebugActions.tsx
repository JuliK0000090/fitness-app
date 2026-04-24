"use client";

import { useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ReprocessButton({ rawId }: { rawId: string }) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/health-debug/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawId }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Reprocess event fired — check Inngest dashboard");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={cn(
        "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white/70",
        loading && "opacity-50"
      )}
    >
      <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
      Reprocess
    </button>
  );
}

export function SimulateButton({ webhookUrl }: { webhookUrl: string }) {
  const [loading, setLoading] = useState(false);

  const testPayload = {
    data: [
      {
        name: "Steps Count",
        data: [{ qty: 1234, date: new Date().toISOString().split("T")[0] + " 00:00:00 +0000" }],
        units: "count",
      },
      {
        name: "Heart Rate",
        data: [{ Avg: 72, date: new Date().toISOString().split("T")[0] + " 00:00:00 +0000" }],
        units: "bpm",
      },
    ],
    workouts: [],
  };

  async function handle() {
    setLoading(true);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Test payload sent — check Last 20 Raw Payloads");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={cn(
        "flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white/80",
        loading && "opacity-50"
      )}
    >
      <Zap size={11} className={loading ? "animate-pulse" : ""} />
      {loading ? "Sending..." : "Simulate payload"}
    </button>
  );
}
