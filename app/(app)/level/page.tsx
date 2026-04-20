import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Zap, Trophy, Target, Scale } from "lucide-react";

export default async function LevelPage() {
  const session = await requireSession();
  const userId = session.userId;

  const [workoutCount, measurementCount, goalAchieved, streaks, achievements] = await Promise.all([
    prisma.workoutLog.count({ where: { userId } }),
    prisma.measurement.count({ where: { userId } }),
    prisma.goal.count({ where: { userId, status: "achieved" } }),
    prisma.streak.findMany({ where: { userId } }),
    prisma.achievement.findMany({ where: { userId }, orderBy: { earnedAt: "desc" }, take: 20 }),
  ]);

  const xp = workoutCount * 25 + measurementCount * 10 + goalAchieved * 150;
  const level = Math.floor(xp / 500) + 1;
  const xpInLevel = xp % 500;
  const xpToNext = 500 - xpInLevel;
  const xpPct = (xpInLevel / 500) * 100;

  const workoutStreak = streaks.find((s) => s.type === "workout");

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-4">
      <div className="fu">
        <h1 className="text-lg font-bold">Level & XP</h1>
        <p className="text-xs text-muted-foreground">Your fitness journey progress</p>
      </div>

      {/* Level card */}
      <div className="glass rounded-2xl p-6 text-center fu2">
        <div className="w-20 h-20 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl font-black text-background">{level}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-1">Level {level} · {xp} total XP</p>
        <p className="text-lg font-bold mb-3">{xpToNext} XP to Level {level + 1}</p>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-white/[0.06] transition-all duration-700"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      {/* XP sources */}
      <div className="glass rounded-2xl p-4 fu2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">XP Sources</p>
        <div className="space-y-2">
          {[
            { icon: Zap, color: "rgba(255,255,255,0.5)", label: "Workouts logged", count: workoutCount, xpEach: 25 },
            { icon: Scale, color: "rgba(255,255,255,0.5)", label: "Measurements logged", count: measurementCount, xpEach: 10 },
            { icon: Target, color: "rgba(255,255,255,0.5)", label: "Goals achieved", count: goalAchieved, xpEach: 150 },
          ].map(({ icon: Icon, color, label, count, xpEach }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Icon size={13} style={{ color: "rgba(255,255,255,0.5)" }} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">{label}</p>
                <p className="text-[10px] text-muted-foreground">{count}× · {xpEach} XP each</p>
              </div>
              <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{count * xpEach}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Streak */}
      {workoutStreak && (
        <div className="glass rounded-2xl p-4 fu2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Workout Streak</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black text-white/60">{workoutStreak.current}</p>
            <div className="pb-1">
              <p className="text-sm font-medium">days</p>
              <p className="text-xs text-muted-foreground">Best: {workoutStreak.longest}d</p>
            </div>
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="glass rounded-2xl p-4 fu3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Achievements</p>
          <div className="space-y-2">
            {achievements.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Trophy size={16} className="text-white/50" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">{a.title}</p>
                  {a.description && <p className="text-[10px] text-muted-foreground">{a.description}</p>}
                </div>
                <p className="text-xs text-white/60 font-semibold">+{a.xpAwarded}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
