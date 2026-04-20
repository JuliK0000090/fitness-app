"use client";

import { CalendarDays, Dumbbell } from "lucide-react";

interface PlanDay {
  day: string; // "Mon", "Tue", etc.
  workouts: string[];
  rest: boolean;
}

interface PlanCardProps {
  weekLabel: string;
  days: PlanDay[];
  onAccept?: () => void;
}

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PlanCard({ weekLabel, days, onAccept }: PlanCardProps) {
  const sorted = [...days].sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-[#A78BFA]/20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#A78BFA]/20 flex items-center justify-center">
          <CalendarDays size={16} className="text-[#A78BFA]" />
        </div>
        <div>
          <p className="text-sm font-semibold">Weekly Plan</p>
          <p className="text-[10px] text-muted-foreground">{weekLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {sorted.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-muted-foreground uppercase">{d.day}</span>
            <div
              className={`w-full min-h-[2.5rem] rounded-lg flex flex-col items-center justify-center gap-0.5 p-1 ${
                d.rest ? "bg-secondary" : "bg-[#A78BFA]/15 border border-[#A78BFA]/30"
              }`}
            >
              {d.rest ? (
                <span className="text-[9px] text-muted-foreground">Rest</span>
              ) : (
                <>
                  <Dumbbell size={10} className="text-[#A78BFA]" />
                  {d.workouts.map((w, i) => (
                    <span key={i} className="text-[8px] text-center text-foreground/70 leading-tight">{w}</span>
                  ))}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {onAccept && (
        <button
          onClick={onAccept}
          className="w-full text-xs py-1.5 rounded-lg bg-[#A78BFA]/10 text-[#A78BFA] hover:bg-[#A78BFA]/20 transition-colors"
        >
          Accept this plan
        </button>
      )}
    </div>
  );
}
