"use client";

import { Flame } from "lucide-react";

interface HabitStreakCardProps {
  habitName: string;
  currentStreak: number;
  longestStreak: number;
  last30Days?: boolean[]; // true = done
}

export function HabitStreakCard({ habitName, currentStreak, longestStreak, last30Days = [] }: HabitStreakCardProps) {
  const days = last30Days.slice(-28); // show last 4 weeks

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-[#F472B6]/20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#F472B6]/20 flex items-center justify-center">
          <Flame size={16} className="text-[#F472B6]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{habitName}</p>
          <p className="text-[10px] text-muted-foreground">Habit streak</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#F472B6]">{currentStreak}</p>
          <p className="text-[10px] text-muted-foreground">day streak</p>
        </div>
      </div>

      {/* Mini heatmap */}
      {days.length > 0 && (
        <div className="grid grid-cols-7 gap-1">
          {days.map((done, i) => (
            <div
              key={i}
              className={`h-5 rounded-sm ${done ? "bg-[#F472B6]/70" : "bg-secondary"}`}
              title={done ? "Done" : "Missed"}
            />
          ))}
        </div>
      )}

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Current: <span className="text-[#F472B6] font-semibold">{currentStreak}d</span></span>
        <span>Best: <span className="text-foreground font-semibold">{longestStreak}d</span></span>
      </div>
    </div>
  );
}
