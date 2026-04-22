"use client";

import { WorkoutCard } from "./WorkoutCard";
import { GoalCard } from "./GoalCard";
import { GoalDraftCard } from "./GoalDraftCard";
import { ChecklistCard } from "./ChecklistCard";
import { MeasurementCard } from "./MeasurementCard";
import { HabitStreakCard } from "./HabitStreakCard";
import { WeeklyReviewCard } from "./WeeklyReviewCard";
import { PhotoDiffCard } from "./PhotoDiffCard";
import { PlanCard } from "./PlanCard";
import { BodyMapCard } from "./BodyMapCard";
import { TimerCard } from "./TimerCard";
import { NutritionCard } from "./NutritionCard";
import { IntegrationCard } from "./IntegrationCard";
import { CrisisCard } from "./CrisisCard";
import { FormCheck } from "../vision/FormCheck";
import { PhotoMeasure } from "../vision/PhotoMeasure";

interface ToolResultRendererProps {
  toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
}

export function ToolResultRenderer({ toolName, result }: ToolResultRendererProps) {
  if (!result) return null;

  try {
    switch (toolName) {
      case "log_workout":
        return (
          <WorkoutCard
            workoutId={result.workoutId}
            workoutName={result.workoutName}
            durationMin={result.durationMin}
            intensity={result.intensity}
            caloriesEst={result.caloriesEst}
            xpAwarded={result.xpAwarded}
          />
        );

      case "propose_goal_decomposition":
        return (
          <GoalDraftCard
            title={result.title}
            category={result.category}
            visionText={result.visionText}
            deadline={result.deadline}
            deadlineWeeks={result.deadlineWeeks}
            habits={result.habits ?? []}
            workouts={result.workouts ?? []}
            measurements={result.measurements ?? []}
            matchedPreset={result.matched_preset}
          />
        );

      case "create_full_plan":
        return (
          <div className="glass rounded-2xl p-4 my-2 border border-white/[0.1] space-y-1">
            <p className="text-sm font-semibold text-white/80">{result.title}</p>
            <p className="text-xs text-white/40">
              {result.habitsCreated} habits · {result.workoutsScheduled} sessions scheduled
            </p>
            {result.nextSteps && <p className="text-xs text-white/30">{result.nextSteps}</p>}
          </div>
        );

      case "add_goal":
      case "update_goal":
        return (
          <GoalCard
            goalId={result.goalId ?? result.id}
            description={result.title ?? result.description ?? "Goal"}
            direction={result.direction ?? "achieve"}
            magnitude={result.magnitude}
            unit={result.unit}
            deadline={result.deadline}
            status={result.status ?? "active"}
            predictedHitDate={result.predictedHitDate}
          />
        );

      case "list_goals":
        if (!Array.isArray(result.goals)) return null;
        return (
          <div className="space-y-1">
            {result.goals.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (g: any) => (
                <GoalCard
                  key={g.goalId ?? g.id}
                  goalId={g.goalId ?? g.id}
                  description={g.title ?? g.description ?? "Goal"}
                  direction={g.direction ?? "achieve"}
                  magnitude={g.magnitude}
                  unit={g.unit}
                  deadline={g.deadline}
                  status={g.status}
                  predictedHitDate={g.predictedHitDate}
                />
              )
            )}
          </div>
        );

      case "complete_habit":
        return (
          <div className="glass rounded-xl px-4 py-3 my-1 border border-white/[0.08] flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border border-white/30 bg-white/10 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 12 12" width="10" height="10"><polyline points="2,6 5,9 10,3" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/70">{result.habitTitle}</p>
            </div>
            <p className="text-xs text-white/40">+{result.pointsEarned} XP</p>
            {result.bonusEarned && <p className="text-[10px] text-white/30">All done!</p>}
          </div>
        );

      case "complete_workout":
        return (
          <WorkoutCard
            workoutId={result.workoutLogId}
            workoutName={result.workoutName}
            durationMin={result.durationMin}
            xpAwarded={result.xpAwarded}
          />
        );

      case "get_today_plan":
        return (
          <div className="glass rounded-2xl p-4 my-2 space-y-2">
            {(result.scheduledWorkouts ?? []).map((sw: { scheduledWorkoutId: string; name: string; duration: number; scheduledTime?: string }) => (
              <div key={sw.scheduledWorkoutId} className="flex items-center gap-2 text-sm text-white/65">
                <span className="text-white/30">Workout</span>
                <span>{sw.name} · {sw.duration} min{sw.scheduledTime ? ` · ${sw.scheduledTime}` : ""}</span>
              </div>
            ))}
            {(result.habits ?? []).map((h: { habitId: string; title: string; done: boolean }) => (
              <div key={h.habitId} className="flex items-center gap-2 text-sm text-white/55">
                <span>{h.done ? "✓" : "○"}</span>
                <span className={h.done ? "line-through text-white/30" : ""}>{h.title}</span>
              </div>
            ))}
          </div>
        );

      case "get_todays_checklist":
        return <ChecklistCard items={result.items ?? []} />;

      case "log_measurement":
        return (
          <MeasurementCard
            metricType={result.metricType}
            value={result.value}
            unit={result.unit}
            delta={result.delta}
            history={result.history}
          />
        );

      case "list_measurements":
        if (!Array.isArray(result.measurements)) return null;
        return (
          <div className="space-y-1">
            {result.measurements.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (m: any, i: number) => (
                <MeasurementCard
                  key={i}
                  metricType={m.metricType}
                  value={m.value}
                  unit={m.unit}
                  delta={m.delta}
                />
              )
            )}
          </div>
        );

      case "add_habit":
      case "update_habit":
        return (
          <HabitStreakCard
            habitName={result.name}
            currentStreak={result.currentStreak ?? 0}
            longestStreak={result.longestStreak ?? 0}
            last30Days={result.last30Days}
          />
        );

      case "generate_weekly_review":
        return (
          <WeeklyReviewCard
            weekOf={result.weekOf}
            adherencePct={result.adherencePct}
            workoutsCompleted={result.workoutsCompleted}
            workoutsPlanned={result.workoutsPlanned}
            aiVerdict={result.aiVerdict}
            suggestions={result.suggestions}
            reviewId={result.reviewId}
          />
        );

      case "compare_photos":
        return (
          <PhotoDiffCard
            beforeUrl={result.beforeUrl}
            afterUrl={result.afterUrl}
            beforeDate={result.beforeDate}
            afterDate={result.afterDate}
            deltaWeeks={result.deltaWeeks}
          />
        );

      case "generate_plan":
        return (
          <PlanCard
            weekLabel={result.weekLabel}
            days={result.days ?? []}
          />
        );

      case "show_muscle_map":
        return (
          <BodyMapCard
            worked={result.worked}
            sore={result.sore}
          />
        );

      case "start_timer":
        return (
          <TimerCard
            durationSec={result.durationSec}
            label={result.label}
          />
        );

      case "log_nutrition":
        return (
          <NutritionCard
            mealName={result.mealName}
            calories={result.calories}
            caloriesTarget={result.caloriesTarget}
            protein={result.protein}
            carbs={result.carbs}
            fat={result.fat}
            proteinTarget={result.proteinTarget}
            carbsTarget={result.carbsTarget}
            fatTarget={result.fatTarget}
            items={result.items}
          />
        );

      case "connect_integration":
        return (
          <IntegrationCard
            provider={result.provider}
            connected={result.connected ?? false}
            lastSynced={result.lastSynced}
            metrics={result.metrics}
          />
        );

      case "import_workouts_from_screenshot":
        return (
          <div className="glass rounded-2xl p-4 my-2 fu border border-white/[0.07] space-y-2">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">
              Imported {result.imported} workout{result.imported !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-4 text-[11px] text-white/40">
              {result.completed > 0 && <span>{result.completed} logged</span>}
              {result.cancelled > 0 && <span>{result.cancelled} cancelled</span>}
              {result.duplicates > 0 && <span className="text-yellow-400/60">{result.duplicates} already existed — skipped</span>}
            </div>
            <div className="divide-y divide-white/[0.05]">
              {(result.workouts as { date: string; time?: string; className: string; status: string }[]).map((w, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    w.status === "logged" ? "bg-white/50" :
                    w.status === "duplicate" ? "bg-yellow-400/40" :
                    "bg-white/15"
                  }`} />
                  <span className={`text-xs flex-1 truncate ${w.status === "duplicate" ? "text-white/30 line-through" : "text-white/60"}`}>{w.className}</span>
                  <span className="text-[10px] text-white/25 shrink-0">{w.date}{w.time ? ` ${w.time}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "delete_duplicate_workouts":
        return (
          <div className="glass rounded-2xl px-4 py-3 my-2 fu border border-white/[0.07] flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
            <p className="text-xs text-white/55">{result.message}</p>
          </div>
        );

      case "show_crisis_resources":
        return <CrisisCard message={result.message} />;

      case "show_form_check":
        if (result.action === "open_form_check") {
          return (
            <div className="glass rounded-2xl p-4 my-2 fu border border-white/[0.07]">
              <FormCheck onClose={() => {}} />
            </div>
          );
        }
        return null;

      case "estimate_body_measurements":
        if (result.action === "open_photo_measure") {
          return (
            <div className="glass rounded-2xl p-4 my-2 fu border border-white/[0.07]">
              <PhotoMeasure />
            </div>
          );
        }
        return null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}
