"use client";

import { useState } from "react";
import { Dumbbell, Clock, Star, Search } from "lucide-react";
import { format } from "date-fns";

interface WorkoutType {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface Favorite {
  name: string;
  count: number;
  lastDuration: number;
}

interface RecentWorkout {
  id: string;
  name: string;
  durationMin: number;
  intensity?: number;
  startedAt: string;
}

interface LibraryViewProps {
  workoutTypes: WorkoutType[];
  favorites: Favorite[];
  recentWorkouts: RecentWorkout[];
}

const TABS = ["Recent", "Favorites", "Browse"] as const;

export function LibraryView({ workoutTypes, favorites, recentWorkouts }: LibraryViewProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Recent");
  const [search, setSearch] = useState("");

  const filteredTypes = workoutTypes.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-4">
      <div className="flex items-center gap-3 fu">
        <div className="w-9 h-9 rounded-2xl bg-[#A78BFA]/20 flex items-center justify-center">
          <Dumbbell size={18} className="text-[#A78BFA]" />
        </div>
        <h1 className="text-lg font-bold">Library</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${tab === t ? "bg-white/10 text-foreground font-medium" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Recent" && (
        <div className="space-y-2 fu">
          {recentWorkouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No workouts logged yet.</p>
          ) : recentWorkouts.map((w) => (
            <div key={w.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#A78BFA]/20 flex items-center justify-center shrink-0">
                <Dumbbell size={14} className="text-[#A78BFA]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{w.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock size={10} />{w.durationMin} min
                  {w.intensity && <span>· RPE {w.intensity}</span>}
                  <span>· {format(new Date(w.startedAt), "MMM d")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Favorites" && (
        <div className="space-y-2 fu">
          {favorites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Log workouts to see your favorites.</p>
          ) : favorites.map((f) => (
            <div key={f.name} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FBBF24]/20 flex items-center justify-center shrink-0">
                <Star size={14} className="text-[#FBBF24]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{f.name}</p>
                <p className="text-[10px] text-muted-foreground">Logged {f.count}× · ~{f.lastDuration} min</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Browse" && (
        <div className="space-y-3 fu">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises…"
              className="w-full bg-secondary rounded-xl pl-8 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {filteredTypes.map((t) => (
            <div key={t.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#A78BFA]/20 flex items-center justify-center shrink-0">
                <Dumbbell size={14} className="text-[#A78BFA]" />
              </div>
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                {t.category && <p className="text-[10px] text-muted-foreground capitalize">{t.category}</p>}
              </div>
            </div>
          ))}
          {filteredTypes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No exercises found.</p>
          )}
        </div>
      )}
    </div>
  );
}
