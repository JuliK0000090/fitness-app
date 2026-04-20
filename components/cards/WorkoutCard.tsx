"use client";

import { Dumbbell, Clock, Flame } from "lucide-react";
import { toast } from "sonner";

interface WorkoutCardProps {
  workoutId: string;
  workoutName: string;
  durationMin: number;
  intensity?: number;
  caloriesEst?: number;
  xpAwarded?: number;
}

export function WorkoutCard({ workoutId, workoutName, durationMin, intensity, caloriesEst, xpAwarded }: WorkoutCardProps) {
  async function logAgainTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split("T")[0];
    await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, description: `${workoutName} — ${durationMin} min` }),
    });
    toast.success("Scheduled for tomorrow");
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl border border-white/[0.07] flex items-center justify-center shrink-0">
          <Dumbbell size={14} className="text-white/50" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-white/80">{workoutName}</p>
          <p className="text-[10px] text-white/30">Workout logged</p>
        </div>
        {xpAwarded && (
          <span className="text-[10px] tracking-wide text-white/35">+{xpAwarded} XP</span>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-1.5 text-xs text-white/35">
          <Clock size={11} />{durationMin} min
        </div>
        {intensity && (
          <div className="text-xs text-white/35">
            RPE {intensity}/10
          </div>
        )}
        {caloriesEst && (
          <div className="flex items-center gap-1.5 text-xs text-white/35">
            <Flame size={11} />{Math.round(caloriesEst)} kcal
          </div>
        )}
      </div>

      <button
        onClick={logAgainTomorrow}
        className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.07] text-white/35 hover:border-white/15 hover:text-white/55 transition-all"
      >
        Log again tomorrow
      </button>
    </div>
  );
}
