"use client";

import { WorkoutCard } from "./WorkoutCard";
import { GoalCard } from "./GoalCard";
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

      case "add_goal":
      case "update_goal":
        return (
          <GoalCard
            goalId={result.goalId ?? result.id}
            description={result.description}
            direction={result.direction}
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
                  key={g.id}
                  goalId={g.id}
                  description={g.description}
                  direction={g.direction}
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
