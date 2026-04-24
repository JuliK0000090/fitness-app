"use client";

import { useEffect, useState } from "react";
import { Activity, Heart, Moon, Footprints, Zap } from "lucide-react";
import Link from "next/link";

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
  { key: "steps",        label: "Steps",      icon: Footprints, format: (v) => v.toLocaleString() },
  { key: "sleepHours",   label: "Sleep",      icon: Moon,       format: (v) => `${Math.floor(v)}h ${Math.round((v % 1) * 60)}m` },
  { key: "hrvMs",        label: "HRV",        icon: Zap,        format: (v) => `${Math.round(v)}`, unit: "ms" },
  { key: "restingHr",    label: "Resting HR", icon: Heart,      format: (v) => `${Math.round(v)}`, unit: "bpm" },
  { key: "activeMinutes",label: "Active",     icon: Activity,   format: (v) => `${Math.round(v)}`, unit: "min" },
];

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
    <div className="border border-border-subtle bg-bg-surface rounded-md p-4">
      <div className="h-3 w-24 bg-bg-elevated rounded animate-pulse mb-3" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-14 bg-bg-elevated rounded animate-pulse" />
        ))}
      </div>
    </div>
  );

  if (!hasData) return (
    <Link
      href="/settings/wearables"
      className="border border-border-subtle bg-bg-surface rounded-md p-4 flex items-center gap-4 hover:border-border-default transition-colors group"
    >
      <div className="w-9 h-9 rounded border border-border-subtle flex items-center justify-center shrink-0">
        <Activity size={15} strokeWidth={1.5} className="text-text-disabled group-hover:text-text-muted transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">Connect a wearable</p>
        <p className="text-caption text-text-muted mt-0.5">Apple Health, Oura, Whoop, Garmin — sleep, steps, and HRV automatically.</p>
      </div>
      <span className="text-text-disabled group-hover:text-text-muted transition-colors text-caption">→</span>
    </Link>
  );

  return (
    <div className="border border-border-subtle bg-bg-surface rounded-md p-4">
      <p className="text-label uppercase tracking-widest text-text-disabled font-sans font-medium mb-3">
        Today&apos;s signals
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {DISPLAY.map(({ key, label, icon: Icon, format, unit }) => {
          const metric = signals?.[key];
          if (!metric) return null;
          return (
            <div key={key} className="border border-border-subtle bg-bg-elevated rounded p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <Icon size={11} strokeWidth={1.5} className="text-text-disabled" />
                <span
                  className="text-[9px] font-mono tabular-nums text-text-disabled"
                  title={`Trust: ${metric.trust}/100`}
                >
                  {metric.trust}%
                </span>
              </div>
              <p className="font-serif text-heading-md font-light text-text-primary leading-none">
                {format(metric.value)}
                {unit && <span className="text-caption text-text-muted ml-0.5">{unit}</span>}
              </p>
              <p className="text-caption text-text-muted">{label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
