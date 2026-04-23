"use client";

import { useEffect, useState } from "react";
import { Activity, Heart, Moon, Footprints, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metric {
  value: number;
  unit: string;
  source: string;
  trust: number;
}

type Signals = Record<string, Metric>;

const DISPLAY: Array<{
  key: string;
  label: string;
  icon: React.ElementType;
  format: (v: number) => string;
  unit?: string;
}> = [
  { key: "steps", label: "Steps", icon: Footprints, format: (v) => v.toLocaleString() },
  { key: "sleepHours", label: "Sleep", icon: Moon, format: (v) => `${Math.floor(v)}h ${Math.round((v % 1) * 60)}m` },
  { key: "hrvMs", label: "HRV", icon: Zap, format: (v) => `${Math.round(v)}`, unit: "ms" },
  { key: "restingHr", label: "Resting HR", icon: Heart, format: (v) => `${Math.round(v)}`, unit: "bpm" },
  { key: "activeMinutes", label: "Active", icon: Activity, format: (v) => `${Math.round(v)}`, unit: "min" },
];

function TrustBadge({ trust }: { trust: number }) {
  const color = trust >= 90 ? "text-emerald-400" : trust >= 75 ? "text-yellow-400" : "text-orange-400";
  return (
    <span className={cn("text-[9px] font-mono", color)} title={`Trust score: ${trust}/100`}>
      {trust}%
    </span>
  );
}

export function TodaySignals() {
  const [signals, setSignals] = useState<Signals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health/today")
      .then((r) => r.json())
      .then((d) => { setSignals(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const hasData = signals && Object.keys(signals).length > 0;

  if (loading) return (
    <div className="glass rounded-2xl p-4">
      <div className="h-4 w-24 bg-white/5 rounded animate-pulse mb-3" />
      <div className="flex gap-3">
        {[1,2,3,4].map(i => <div key={i} className="flex-1 h-12 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  if (!hasData) return (
    <a
      href="/settings/wearables"
      className="glass rounded-2xl p-4 flex items-center gap-4 border border-white/[0.07] hover:border-white/20 transition-colors group"
    >
      <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
        <Activity size={18} className="text-white/40 group-hover:text-white/60 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">Connect a wearable</p>
        <p className="text-xs text-white/35 mt-0.5">Apple Health, Oura, Whoop, Garmin — Vita reads your sleep, steps, and HRV automatically.</p>
      </div>
      <span className="text-white/25 group-hover:text-white/50 transition-colors text-lg">→</span>
    </a>
  );

  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Today&apos;s signals</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {DISPLAY.map(({ key, label, icon: Icon, format, unit }) => {
          const metric = signals?.[key];
          if (!metric) return null;
          return (
            <div key={key} className="glass rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <Icon size={12} className="text-muted-foreground" />
                <TrustBadge trust={metric.trust} />
              </div>
              <p className="text-lg font-semibold leading-none">
                {format(metric.value)}
                {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-[9px] text-muted-foreground/60">{metric.source}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
