"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, Dumbbell, Bell, X, MessageSquarePlus, RefreshCw } from "lucide-react";
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

const STREAK_LABELS: Record<string, string> = {
  workout: "Workout",
  checklist: "Daily",
  measurement: "Tracking",
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

  const xpPct = Math.min(100, ((500 - xpToNext) / 500) * 100);

  return (
    <div className="max-w-lg mx-auto py-6 px-5 space-y-5">

      {/* Header */}
      <div className="fu">
        <p className="text-[10px] tracking-[0.25em] uppercase text-white/30 mb-1">{format(new Date(), "EEEE, MMMM d")}</p>
        <p className="text-sm text-white/45">{greeting},</p>
        <h1 className="font-cormorant text-4xl font-light text-white/90 mt-0.5">{userName}</h1>
      </div>

      {/* XP bar */}
      <div className="glass rounded-2xl p-4 fu2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="font-cormorant text-2xl font-light text-white/85">Level {level}</span>
          </div>
          <span className="text-[10px] tracking-wide text-white/30">{xp} XP · {xpToNext} to next</span>
        </div>
        <div className="h-px w-full bg-white/[0.08] overflow-hidden rounded-full">
          <div
            className="h-full bg-white/50 transition-all duration-700"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      {/* Notifications */}
      {notifications.map((n) => (
        <div key={n.id} className="glass rounded-2xl p-4 flex gap-3 fu border border-white/[0.07]">
          <Bell size={13} className="text-white/40 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/70">{n.title}</p>
            <p className="text-xs text-white/35 line-clamp-2 mt-0.5">{n.body}</p>
          </div>
          <button onClick={() => dismissNotification(n.id)} className="p-1 rounded hover:bg-secondary shrink-0">
            <X size={11} className="text-white/30" />
          </button>
        </div>
      ))}

      {/* Checklist */}
      {checklist.length > 0 ? (
        <ChecklistCard items={checklist} />
      ) : (
        <div className="glass rounded-2xl p-5 text-center fu2">
          <p className="text-sm text-white/30 mb-4">No checklist yet today</p>
          <button
            onClick={generateChecklist}
            className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl border border-white/10 text-white/40 hover:border-white/20 hover:text-white/60 transition-all"
          >
            <RefreshCw size={11} />
            Generate checklist
          </button>
        </div>
      )}

      {/* Streaks */}
      {streaks.length > 0 && (
        <div className="grid grid-cols-3 gap-2 fu2">
          {streaks.map((s) => (
            <div key={s.type} className="glass rounded-2xl p-4 text-center">
              <Flame size={14} className="mx-auto mb-2 text-white/30" />
              <p className="font-cormorant text-3xl font-light text-white/80">{s.current}</p>
              <p className="text-[9px] tracking-widest uppercase text-white/25 mt-1">{STREAK_LABELS[s.type] ?? s.type}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent workouts */}
      {recentWorkouts.length > 0 && (
        <div className="space-y-2 fu3">
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 px-1">Recent</p>
          {recentWorkouts.map((w) => (
            <div key={w.id} className="glass rounded-2xl p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-xl border border-white/[0.07] flex items-center justify-center shrink-0">
                <Dumbbell size={13} className="text-white/40" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/75">{w.name}</p>
                <p className="text-xs text-white/30 mt-0.5">{w.durationMin} min · {format(new Date(w.startedAt), "EEE MMM d")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="fu3 pb-6">
        <Link
          href="/chat"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/[0.09] text-sm text-white/40 hover:border-white/20 hover:text-white/65 transition-all"
        >
          <MessageSquarePlus size={15} />
          Talk to Vita
        </Link>
      </div>

    </div>
  );
}
