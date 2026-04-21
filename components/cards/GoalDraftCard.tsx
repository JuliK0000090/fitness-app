"use client";

import { useState, useTransition } from "react";
import { Target, CheckCircle2, Dumbbell, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DraftHabit {
  title: string;
  cadence: string;
  duration?: number;
  icon?: string;
}

interface DraftWorkout {
  workoutTypeName: string;
  timesPerWeek: number;
  duration: number;
}

interface GoalDraftCardProps {
  title: string;
  category?: string;
  visionText?: string;
  deadline?: string;
  deadlineWeeks?: number;
  habits: DraftHabit[];
  workouts: DraftWorkout[];
  measurements?: string[];
  matchedPreset?: string | null;
  // When locked in, parent provides the conversationId for the create_full_plan follow-up
  conversationId?: string;
}

export function GoalDraftCard({
  title,
  category,
  visionText,
  deadline,
  habits: initHabits,
  workouts: initWorkouts,
  measurements,
}: GoalDraftCardProps) {
  const [habits, setHabits] = useState(initHabits);
  const [workouts, setWorkouts] = useState(initWorkouts);
  const [locked, setLocked] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function removeHabit(i: number) {
    setHabits((prev) => prev.filter((_, idx) => idx !== i));
  }

  function removeWorkout(i: number) {
    setWorkouts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function adjustWorkout(i: number, delta: number) {
    setWorkouts((prev) => prev.map((w, idx) =>
      idx === i ? { ...w, timesPerWeek: Math.max(1, Math.min(7, w.timesPerWeek + delta)) } : w
    ));
  }

  function lockIn() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/goals/create-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, category, visionText, deadline, habits, workouts }),
        });
        if (!res.ok) throw new Error("Failed");
        setLocked(true);
        toast.success("Plan created. Your first week starts now.");
        setTimeout(() => router.push("/today"), 1200);
      } catch {
        toast.error("Couldn't save the plan. Try again.");
      }
    });
  }

  if (locked) {
    return (
      <div className="glass rounded-2xl p-5 text-center my-2 border border-white/[0.1]">
        <Check size={20} className="mx-auto mb-2 text-white/60" />
        <p className="text-sm text-white/65">Plan saved. Opening today...</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden my-2 border border-white/[0.1]">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl border border-white/[0.07] flex items-center justify-center shrink-0">
            <Target size={16} className="text-white/50" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/85">{title}</p>
            {visionText && visionText !== title && (
              <p className="text-xs text-white/35 mt-0.5 line-clamp-2">{visionText}</p>
            )}
            {deadline && (
              <p className="text-[10px] text-white/25 mt-1">Target: {deadline}</p>
            )}
          </div>
        </div>
      </div>

      {/* Workouts */}
      {workouts.length > 0 && (
        <div className="px-5 py-3 border-t border-white/[0.06]">
          <p className="text-[9px] tracking-wider uppercase text-white/25 mb-2">Weekly workouts</p>
          <div className="flex flex-wrap gap-2">
            {workouts.map((w, i) => (
              <div key={i} className="flex items-center gap-1.5 glass rounded-lg px-2.5 py-1.5">
                <Dumbbell size={10} className="text-white/35" />
                <span className="text-xs text-white/60">{w.workoutTypeName}</span>
                <div className="flex items-center gap-0.5 ml-1">
                  <button onClick={() => adjustWorkout(i, -1)} className="w-4 h-4 rounded flex items-center justify-center text-white/30 hover:text-white/60 text-xs">−</button>
                  <span className="text-[11px] text-white/55 w-3 text-center">{w.timesPerWeek}</span>
                  <button onClick={() => adjustWorkout(i, +1)} className="w-4 h-4 rounded flex items-center justify-center text-white/30 hover:text-white/60 text-xs">+</button>
                </div>
                <span className="text-[9px] text-white/25">×/wk</span>
                <button onClick={() => removeWorkout(i)} className="ml-0.5 text-white/20 hover:text-white/50">
                  <X size={9} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habits */}
      {habits.length > 0 && (
        <div className="px-5 py-3 border-t border-white/[0.06]">
          <p className="text-[9px] tracking-wider uppercase text-white/25 mb-2">Daily habits</p>
          <div className="space-y-1">
            {habits.map((h, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <CheckCircle2 size={11} className="text-white/25 shrink-0" />
                <span className="text-xs text-white/60 flex-1">{h.title}</span>
                {h.duration && (
                  <span className="text-[9px] text-white/20">{h.duration} min</span>
                )}
                <button
                  onClick={() => removeHabit(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white/50"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Measurements */}
      {measurements && measurements.length > 0 && (
        <div className="px-5 py-3 border-t border-white/[0.06]">
          <p className="text-[9px] tracking-wider uppercase text-white/25 mb-2">Tracking</p>
          <div className="flex flex-wrap gap-1.5">
            {measurements.map((m) => (
              <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/35">
                {m.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-4 border-t border-white/[0.06] flex gap-2">
        <button
          onClick={lockIn}
          className="flex-1 py-2.5 rounded-xl bg-white/[0.09] text-sm font-medium text-white/75 hover:bg-white/[0.13] transition-colors"
        >
          Lock in
        </button>
        <button className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-sm text-white/35 hover:bg-white/[0.07] transition-colors">
          Adjust
        </button>
      </div>
    </div>
  );
}
