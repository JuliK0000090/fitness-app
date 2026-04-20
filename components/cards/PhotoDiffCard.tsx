"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";

interface PhotoDiffCardProps {
  beforeUrl: string;
  afterUrl: string;
  beforeDate: string;
  afterDate: string;
  deltaWeeks?: number;
}

export function PhotoDiffCard({ beforeUrl, afterUrl, beforeDate, afterDate, deltaWeeks }: PhotoDiffCardProps) {
  const [sliderX, setSliderX] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  function onPointerMove(e: React.PointerEvent) {
    if (!(e.buttons & 1)) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setSliderX(pct);
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-[#34D399]/20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#34D399]/20 flex items-center justify-center">
          <Camera size={16} className="text-[#34D399]" />
        </div>
        <div>
          <p className="text-sm font-semibold">Progress Photos</p>
          {deltaWeeks && <p className="text-[10px] text-muted-foreground">{deltaWeeks} week transformation</p>}
        </div>
      </div>

      {/* Slider */}
      <div
        ref={containerRef}
        className="relative w-full h-48 rounded-xl overflow-hidden cursor-col-resize select-none"
        onPointerMove={onPointerMove}
      >
        {/* After (full width, behind) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={afterUrl} alt="After" className="absolute inset-0 w-full h-full object-cover" />

        {/* Before (clipped) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderX}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={beforeUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover" style={{ width: `${100 / (sliderX / 100 || 0.01)}%` }} />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg"
          style={{ left: `${sliderX}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow">
            <span className="text-[10px] font-bold text-black">↔</span>
          </div>
        </div>

        {/* Labels */}
        <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white">{beforeDate}</span>
        <span className="absolute bottom-2 right-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white">{afterDate}</span>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">Drag to compare</p>
    </div>
  );
}
