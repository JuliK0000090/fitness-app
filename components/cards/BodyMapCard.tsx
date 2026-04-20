"use client";

import { useState } from "react";

interface MuscleRegion {
  id: string;
  label: string;
  d: string; // SVG path
  side: "front" | "back";
}

const MUSCLES: MuscleRegion[] = [
  // Front
  { id: "chest", label: "Chest", side: "front", d: "M38,44 L62,44 L65,60 L35,60 Z" },
  { id: "shoulders_l", label: "Left Shoulder", side: "front", d: "M28,40 L38,44 L35,60 L22,58 Z" },
  { id: "shoulders_r", label: "Right Shoulder", side: "front", d: "M72,40 L62,44 L65,60 L78,58 Z" },
  { id: "bicep_l", label: "Left Bicep", side: "front", d: "M20,60 L30,60 L28,76 L18,74 Z" },
  { id: "bicep_r", label: "Right Bicep", side: "front", d: "M70,60 L80,60 L82,74 L72,76 Z" },
  { id: "abs", label: "Abs", side: "front", d: "M38,60 L62,60 L60,82 L40,82 Z" },
  { id: "quads_l", label: "Left Quads", side: "front", d: "M36,86 L50,86 L48,110 L34,108 Z" },
  { id: "quads_r", label: "Right Quads", side: "front", d: "M50,86 L64,86 L66,108 L52,110 Z" },
  // Back
  { id: "traps", label: "Traps", side: "back", d: "M38,36 L62,36 L60,50 L40,50 Z" },
  { id: "lats_l", label: "Left Lats", side: "back", d: "M28,50 L42,50 L40,70 L24,66 Z" },
  { id: "lats_r", label: "Right Lats", side: "back", d: "M58,50 L72,50 L76,66 L60,70 Z" },
  { id: "lower_back", label: "Lower Back", side: "back", d: "M40,70 L60,70 L58,84 L42,84 Z" },
  { id: "glutes_l", label: "Left Glutes", side: "back", d: "M36,84 L50,84 L50,100 L34,98 Z" },
  { id: "glutes_r", label: "Right Glutes", side: "back", d: "M50,84 L64,84 L66,98 L50,100 Z" },
  { id: "hamstrings_l", label: "Left Hamstrings", side: "back", d: "M36,100 L50,100 L48,118 L34,116 Z" },
  { id: "hamstrings_r", label: "Right Hamstrings", side: "back", d: "M50,100 L64,100 L66,116 L52,118 Z" },
];

interface BodyMapCardProps {
  worked?: string[]; // muscle ids that were worked
  sore?: string[];
}

export function BodyMapCard({ worked = [], sore = [] }: BodyMapCardProps) {
  const [view, setView] = useState<"front" | "back">("front");
  const [tooltip, setTooltip] = useState<string | null>(null);

  const visibleMuscles = MUSCLES.filter((m) => m.side === view);

  function getColor(id: string) {
    if (sore.includes(id)) return "#F472B6";
    if (worked.includes(id)) return "#A78BFA";
    return "rgba(255,255,255,0.06)";
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-[#A78BFA]/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Muscle Map</p>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setView("front")}
            className={`px-2 py-0.5 rounded ${view === "front" ? "bg-[#A78BFA]/20 text-[#A78BFA]" : "text-muted-foreground hover:text-foreground"}`}
          >
            Front
          </button>
          <button
            onClick={() => setView("back")}
            className={`px-2 py-0.5 rounded ${view === "back" ? "bg-[#A78BFA]/20 text-[#A78BFA]" : "text-muted-foreground hover:text-foreground"}`}
          >
            Back
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <svg viewBox="0 0 100 140" width="120" height="168" className="overflow-visible">
          {/* Body outline */}
          <ellipse cx="50" cy="22" rx="12" ry="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <rect x="30" y="36" width="40" height="50" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <rect x="15" y="38" width="16" height="42" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <rect x="69" y="38" width="16" height="42" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <rect x="32" y="86" width="16" height="40" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <rect x="52" y="86" width="16" height="40" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

          {/* Muscle regions */}
          {visibleMuscles.map((m) => (
            <path
              key={m.id}
              d={m.d}
              fill={getColor(m.id)}
              stroke={worked.includes(m.id) || sore.includes(m.id) ? "rgba(255,255,255,0.3)" : "transparent"}
              strokeWidth="0.5"
              className="cursor-pointer transition-all duration-200 hover:opacity-80"
              onMouseEnter={() => setTooltip(m.label)}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
        </svg>
      </div>

      {tooltip && (
        <p className="text-xs text-center text-muted-foreground">{tooltip}</p>
      )}

      <div className="flex gap-3 justify-center text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#A78BFA]" />Worked</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#F472B6]" />Sore</span>
      </div>
    </div>
  );
}
