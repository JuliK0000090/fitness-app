"use client";

import { cn } from "@/lib/utils";

type Props = {
  proteinAvgG: number;
  proteinTargetG: number;
  proteinDaysHit: number;
  resistanceMinDone: number;
  resistanceMinTarget: number;
  resistanceSessionsDone: number;
  resistanceSessionsTarget: number;
};

export function GLP1Widget({
  proteinAvgG,
  proteinTargetG,
  resistanceMinDone,
  resistanceMinTarget,
  resistanceSessionsDone,
  resistanceSessionsTarget,
  proteinDaysHit,
}: Props) {
  const proteinOnTrack = proteinAvgG >= proteinTargetG * 0.85;
  const resistanceOnTrack = resistanceMinDone >= resistanceMinTarget * 0.85;

  return (
    <div className="border border-border-subtle rounded-md px-4 py-3 space-y-2">
      <p className="text-caption text-text-disabled uppercase tracking-widest">
        GLP-1 mode · this week
      </p>
      <div className="flex gap-6">
        {/* Protein */}
        <div>
          <p className={cn(
            "font-serif text-display-md font-light",
            proteinOnTrack ? "text-champagne" : "text-red-400"
          )}>
            {Math.round(proteinAvgG)}g
            <span className="text-text-muted font-sans text-xs font-normal ml-1">
              / {proteinTargetG}g avg
            </span>
          </p>
          <p className="text-caption text-text-muted">
            {proteinDaysHit} of 7 days hit target
          </p>
        </div>

        <div className="w-px bg-border-subtle" />

        {/* Resistance */}
        <div>
          <p className={cn(
            "font-serif text-display-md font-light",
            resistanceOnTrack ? "text-champagne" : "text-red-400"
          )}>
            {resistanceMinDone}
            <span className="text-text-muted font-sans text-xs font-normal ml-1">
              / {resistanceMinTarget} min
            </span>
          </p>
          <p className="text-caption text-text-muted">
            {resistanceSessionsDone} of {resistanceSessionsTarget} sessions done
          </p>
        </div>
      </div>
    </div>
  );
}
