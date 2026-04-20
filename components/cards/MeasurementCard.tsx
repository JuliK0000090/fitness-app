"use client";

import { Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface MeasurementCardProps {
  metricType: string;
  value: number;
  unit: string;
  delta?: number;
  history?: { value: number }[];
}

function Sparkline({ history }: { history: { value: number }[] }) { // eslint-disable-line
  if (history.length < 2) return null;
  const vals = history.map((h) => h.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MeasurementCard({ metricType, value, unit, delta, history = [] }: MeasurementCardProps) {
  const label = metricType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const isDown = (delta ?? 0) < 0;
  const isUp = (delta ?? 0) > 0;

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-white/[0.07]">
      <div className="flex items-center gap-2">
        <div className="border border-white/[0.07] w-8 h-8 rounded-xl flex items-center justify-center">
          <Scale size={16} className="text-white/50" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-[10px] text-muted-foreground">Measurement logged</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">
            {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
          </p>
          {delta !== undefined && (
            <p className={`text-[11px] flex items-center justify-end gap-0.5 text-white/60`}>
              {isDown ? <TrendingDown size={10} /> : isUp ? <TrendingUp size={10} /> : <Minus size={10} />}
              {isDown ? "" : "+"}{delta} {unit}
            </p>
          )}
        </div>
      </div>

      {history.length >= 2 && (
        <div className="flex items-end justify-between">
          <p className="text-[10px] text-muted-foreground">{history.length} readings</p>
          <Sparkline history={history} />
        </div>
      )}
    </div>
  );
}
