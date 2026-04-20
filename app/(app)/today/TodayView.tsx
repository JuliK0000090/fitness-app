"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, Dumbbell, Bell, X, MessageSquarePlus, Zap, RefreshCw } from "lucide-react";
import { ChecklistCard } from "@/components/cards/ChecklistCard";
import { toast } from "sonner";
import { format } from "date-fns";

interface TodayViewProps {
  userName: string;
  checklist: { id: string; description: string; doneAt: string | null }[];
  streaks: { type: string; current: number; longest: number }[];
  recentWorkouts: { id: string; name: string; durationMin: number; startedAt: string }[];
  notifications: { id: string; type: string; title: string; body: string; createdAt: string }[];
  xp: number;
  level: number;
  xpToNext: number;
}

const STREAK_META: Record<string, { label: string; color: string }> = {
  workout: { label: "Workout", color: "#A78BFA" },
  checklist: { label: "Daily tasks", color: "#22D3EE" },
  measurement: { label: "Measurements", color: "#34D399" },
};

export function TodayView({ userName, checklist, streaks, recentWorkouts, notifications: initNotifications, xp, level, xpToNext }: TodayViewProps) {
  const [notifications, setNotifications] = useState(initNotifications);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  async function dismissNotification(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function generateChecklist() {
    await fetch("/api/checklist/generate", { method: "POST" });
    toast.success("Generating your checklist…");
    setTimeout(() => window.location.reload(), 2000);
  }

  const xpPct = ((500 - xpToNext) / 500) * 100;

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-4">
      {/* Header */}
      <div className="fu">
        <p className="text-xs text-muted-foreground">{greeting},</p>
        <h1 className="text-2xl font-bold">{userName} 👋</h1>
        <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      {/* XP bar */}
      <div className="glass rounded-2xl p-3 fu2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-[#A78BFA]" />
            <span className="text-xs font-semibold">Level {level}</span>
          </div>
          <span className="text-xs text-muted-foreground">{xp} XP · {xpToNext} to next</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#22D3EE] transition-all duration-700"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      {/* Notifications */}
      {notifications.map((n) => (
        <div key={n.id} className="glass rounded-2xl p-3 flex gap-3 fu border border-[#FBBF24]/20">
          <Bell size={14} className="text-[#FBBF24] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">{n.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
          </div>
          <button onClick={() => dismissNotification(n.id)} className="p-1 rounded hover:bg-secondary shrink-0">
            <X size={12} className="text-muted-foreground" />
          </button>
        </div>
      ))}

      {/* Checklist */}
      {checklist.length > 0 ? (
        <ChecklistCard items={checklist} />
      ) : (
        <div className="glass rounded-2xl p-4 text-center fu2">
          <p className="text-sm text-muted-foreground mb-3">No checklist yet today</p>
          <button
            onClick={generateChecklist}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] hover:bg-[#22D3EE]/20 transition-colors mx-auto"
          >
            <RefreshCw size={12} />
            Generate checklist
          </button>
        </div>
      )}

      {/* Streaks */}
      {streaks.length > 0 && (
        <div className="grid grid-cols-3 gap-2 fu2">
          {streaks.map((s) => {
            const meta = STREAK_META[s.type] ?? { label: s.type, color: "#A78BFA" };
            return (
              <div key={s.type} className="glass rounded-2xl p-3 text-center">
                <Flame size={16} className="mx-auto mb-1" style={{ color: meta.color }} />
                <p className="text-xl font-bold" style={{ color: meta.color }}>{s.current}</p>
                <p className="text-[10px] text-muted-foreground">{meta.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent workouts */}
      {recentWorkouts.length > 0 && (
        <div className="space-y-2 fu3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent</p>
          {recentWorkouts.map((w) => (
            <div key={w.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#A78BFA]/20 flex items-center justify-center shrink-0">
                <Dumbbell size={14} className="text-[#A78BFA]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{w.name}</p>
                <p className="text-xs text-muted-foreground">{w.durationMin} min · {format(new Date(w.startedAt), "EEE MMM d")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="fu3 pb-6">
        <Link
          href="/chat"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#A78BFA]/20 to-[#22D3EE]/20 border border-[#A78BFA]/20 text-sm font-medium hover:from-[#A78BFA]/30 hover:to-[#22D3EE]/30 transition-all"
        >
          <MessageSquarePlus size={16} className="text-[#A78BFA]" />
          Talk to Vita
        </Link>
      </div>
    </div>
  );
}
