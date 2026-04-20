"use client";

import { Utensils } from "lucide-react";

interface MacroBarProps {
  label: string;
  grams: number;
  target?: number;
}

function MacroBar({ label, grams, target }: MacroBarProps) {
  const pct = target ? Math.min(100, (grams / target) * 100) : 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{grams}g{target ? ` / ${target}g` : ""}</span>
      </div>
      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 bg-white/40" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface NutritionCardProps {
  mealName?: string;
  calories: number;
  caloriesTarget?: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  items?: string[];
}

export function NutritionCard({
  mealName,
  calories,
  caloriesTarget,
  protein,
  carbs,
  fat,
  proteinTarget,
  carbsTarget,
  fatTarget,
  items = [],
}: NutritionCardProps) {
  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-white/[0.07]">
      <div className="flex items-center gap-2">
        <div className="border border-white/[0.07] w-8 h-8 rounded-xl flex items-center justify-center">
          <Utensils size={16} className="text-white/50" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{mealName ?? "Meal logged"}</p>
          {items.length > 0 && (
            <p className="text-[10px] text-muted-foreground truncate">{items.join(", ")}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white/60">{calories}</p>
          <p className="text-[10px] text-muted-foreground">{caloriesTarget ? `/ ${caloriesTarget} kcal` : "kcal"}</p>
        </div>
      </div>

      {caloriesTarget && (
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-white/40 transition-all duration-500"
            style={{ width: `${Math.min(100, (calories / caloriesTarget) * 100)}%` }}
          />
        </div>
      )}

      <div className="space-y-2">
        <MacroBar label="Protein" grams={protein} target={proteinTarget} />
        <MacroBar label="Carbs" grams={carbs} target={carbsTarget} />
        <MacroBar label="Fat" grams={fat} target={fatTarget} />
      </div>
    </div>
  );
}
