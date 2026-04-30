"use client";

import { useState, useEffect, useCallback } from "react";
import { Smartphone, Link2, Zap, Check, Copy, CheckCircle2, Circle, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface Props {
  webhookUrl: string;
  qrCodeDataUrl: string;
  lastPayloadAt: string | null;
  totalPayloadCount: number;
  daysOfHistory: number;
  active: boolean;
}

interface Status {
  connected: boolean;
  active: boolean;
  lastPayloadAt: string | null;
  totalPayloadCount: number;
  daysOfHistory: number;
}

const APP_STORE_URL =
  "https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069";

export function AppleHealthSetup({
  webhookUrl,
  qrCodeDataUrl,
  lastPayloadAt: initialLastPayloadAt,
  totalPayloadCount: initialPayloadCount,
  daysOfHistory: initialDays,
  active: initialActive,
}: Props) {
  const [checks, setChecks] = useState([false, false, false]);
  const [copied, setCopied] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [status, setStatus] = useState<Status>({
    connected: initialActive && !!initialLastPayloadAt,
    active: initialActive,
    lastPayloadAt: initialLastPayloadAt,
    totalPayloadCount: initialPayloadCount,
    daysOfHistory: initialDays,
  });

  const toggle = (i: number) =>
    setChecks((c) => c.map((v, j) => (j === i ? !v : v)));

  async function copyUrl() {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied");
    setTimeout(() => setCopied(false), 2000);
  }

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/apple-health/status");
      if (!res.ok) return;
      const data: Status = await res.json();
      setStatus(data);
    } catch {
      // ignore
    }
  }, []);

  // Poll every 5 s while not yet connected
  useEffect(() => {
    if (status.connected) return;
    const id = setInterval(pollStatus, 5000);
    return () => clearInterval(id);
  }, [status.connected, pollStatus]);

  async function disconnect() {
    if (!confirm("Disconnect Apple Health? Your historical data will be preserved, but no new data will arrive until you reconnect.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/apple-health/disconnect", { method: "POST" });
      setStatus((s) => ({ ...s, connected: false, active: false }));
      toast.success("Disconnected. Your historical data is preserved.");
      window.location.reload();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  async function backfill() {
    setBackfilling(true);
    try {
      const res = await fetch("/api/admin/bridge-hae-to-health");
      if (!res.ok) throw new Error("backfill request failed");
      const data = await res.json();
      const ok = typeof data.bridgedOk === "number" ? data.bridgedOk : 0;
      const myStepRows = data?.healthDaily?.myStepRows ?? 0;
      toast.success(`Backfilled ${ok} day${ok === 1 ? "" : "s"}. ${myStepRows} step day${myStepRows === 1 ? "" : "s"} are yours.`);
      // Give the toast a moment, then redirect to /today.
      setTimeout(() => { window.location.href = "/today"; }, 1200);
    } catch {
      toast.error("Backfill failed. See server logs.");
    } finally {
      setBackfilling(false);
    }
  }

  async function reconnect() {
    setReconnecting(true);
    try {
      await fetch("/api/integrations/apple-health/reconnect", { method: "POST" });
      toast.success("A new webhook URL has been generated. Update it in Health Auto Export.");
      window.location.reload();
    } catch {
      toast.error("Failed to reconnect");
    } finally {
      setReconnecting(false);
    }
  }

  const isConnected = status.connected && status.active;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Apple Health</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Copy your daily steps, sleep, and workouts into Vita automatically.
          Your data goes directly from your phone to Vita — nothing in between.
        </p>
      </div>

      {/* Connected state */}
      {isConnected && (
        <div className="glass rounded-2xl p-4 mb-6 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 size={16} className="text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-400">Connected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {status.daysOfHistory} days of data imported · {status.totalPayloadCount} payloads received
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Data flows automatically from your iPhone to Vita.
            </p>
            <button
              onClick={backfill}
              disabled={backfilling}
              className="mt-3 inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={backfilling ? "animate-spin" : ""} />
              {backfilling ? "Backfilling…" : "Backfill from existing payloads"}
            </button>
            <p className="text-[10px] text-muted-foreground/70 mt-1.5">
              Re-runs the daily roll-up so missing days appear in /today. Idempotent.
            </p>
          </div>
        </div>
      )}

      {/* Card 1 — Install */}
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <Smartphone size={16} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">1. Install Health Auto Export</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              A CAD $3.99 app from the App Store that ships your Apple Health data on a schedule.
              Your data goes directly from your phone to us — no middleman.
            </p>
          </div>
        </div>
        <Link
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors mb-3"
        >
          Open in App Store
        </Link>
        <button
          onClick={() => toggle(0)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {checks[0] ? (
            <CheckCircle2 size={14} className="text-green-400 shrink-0" />
          ) : (
            <Circle size={14} className="shrink-0" />
          )}
          I&apos;ve installed it
        </button>
      </div>

      {/* Card 2 — Paste URL */}
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <Link2 size={16} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">2. Paste this into Health Auto Export</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Open Health Auto Export. Tap Automations at the bottom, then + New Automation, then REST API.
              Paste this URL. Set Export Format to JSON, Schedule to Hourly, and turn Batch Requests ON.
              Select all Health Metrics and Workouts.
            </p>
          </div>
        </div>

        <div className="bg-black/30 rounded-xl px-3 py-2.5 font-mono text-[11px] text-muted-foreground break-all mb-3 border border-white/5">
          {webhookUrl}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy URL"}
          </button>
          <button
            onClick={() => setShowQr((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showQr ? "Hide QR" : "Show QR code"}
          </button>
        </div>

        {showQr && (
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeDataUrl}
              alt="Webhook URL QR code"
              className="w-40 h-40 rounded-xl bg-white p-2"
            />
          </div>
        )}

        <button
          onClick={() => toggle(1)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {checks[1] ? (
            <CheckCircle2 size={14} className="text-green-400 shrink-0" />
          ) : (
            <Circle size={14} className="shrink-0" />
          )}
          I&apos;ve pasted it
        </button>
      </div>

      {/* Card 3 — First export */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            {isConnected ? (
              <CheckCircle2 size={16} className="text-green-400" />
            ) : (
              <Zap size={16} className="text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">3. Tap &quot;Manual Export&quot; in the app once</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isConnected
                ? `Connected. ${status.daysOfHistory} days of history imported. Data will flow automatically from now on.`
                : "This sends the first batch to Vita — including the last 30 days of your Apple Health data. Once you tap Manual Export in the Health Auto Export app, your first batch arrives here."}
            </p>
          </div>
        </div>

        {!isConnected && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle size={13} className="shrink-0 animate-pulse" />
            Waiting for first payload...
          </div>
        )}

        {isConnected && (
          <button
            onClick={() => toggle(2)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCircle2 size={14} className="text-green-400 shrink-0" />
            Connected
          </button>
        )}
      </div>

      {/* Disconnect / reconnect */}
      {isConnected ? (
        <div className="border-t border-white/5 pt-4 flex items-center gap-3">
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className={cn(
              "text-xs text-muted-foreground hover:text-red-400 transition-colors",
              disconnecting && "opacity-50"
            )}
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
          <span className="text-white/10">·</span>
          <p className="text-xs text-muted-foreground">
            Your historical data is preserved when disconnecting.
          </p>
        </div>
      ) : !status.active && status.lastPayloadAt === null ? null : !status.active ? (
        <div className="border-t border-white/5 pt-4">
          <p className="text-xs text-muted-foreground mb-3">
            Disconnected. Your historical data is preserved. Reconnect to resume data flow.
          </p>
          <button
            onClick={reconnect}
            disabled={reconnecting}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors",
              reconnecting && "opacity-50"
            )}
          >
            <RefreshCw size={13} className={reconnecting ? "animate-spin" : ""} />
            {reconnecting ? "Reconnecting..." : "Reconnect"}
          </button>
        </div>
      ) : null}

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-6 text-center">
        On Oura, Whoop, or Fitbit?{" "}
        <Link href="/settings/integrations" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Connect directly
        </Link>
      </p>
    </div>
  );
}
