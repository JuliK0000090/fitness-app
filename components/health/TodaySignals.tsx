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
    <div className="glass rounded-2xl p-4 text-center">
      <p className="text-xs text-muted-foreground mb-2">No wearable data yet.</p>
      <a href="/settings/integrations" className="text-xs text-primary underline">
        Connect a device →
      </a>
    </div>
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
