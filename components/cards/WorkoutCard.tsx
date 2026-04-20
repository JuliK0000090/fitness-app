"use client";

import { Dumbbell, Clock, Flame, Zap } from "lucide-react";
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
    // Create a checklist item for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split("T")[0];
    await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, description: `${workoutName} — ${durationMin} min` }),
    });
    toast.success("Scheduled for tomorrow!");
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-[#A78BFA]/20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#A78BFA]/20 flex items-center justify-center">
          <Dumbbell size={16} className="text-[#A78BFA]" />
        </div>
        <div>
          <p className="text-sm font-semibold">{workoutName}</p>
          <p className="text-[10px] text-muted-foreground">Workout logged</p>
        </div>
        {xpAwarded && (
          <div className="ml-auto flex items-center gap-1 text-[#A78BFA] text-xs font-semibold">
            <Zap size={12} />+{xpAwarded} XP
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock size={12} />{durationMin} min
        </div>
        {intensity && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[10px]">RPE</span>{intensity}/10
          </div>
        )}
        {caloriesEst && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame size={12} />{Math.round(caloriesEst)} kcal
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={logAgainTomorrow} className="text-xs px-3 py-1.5 rounded-lg bg-[#A78BFA]/10 text-[#A78BFA] hover:bg-[#A78BFA]/20 transition-colors">
          Log again tomorrow
        </button>
      </div>
    </div>
  );
}
