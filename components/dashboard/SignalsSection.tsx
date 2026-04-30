"use client";

import { Footprints, Moon, Heart, Zap, Activity, Flame } from "lucide-react";
import Link from "next/link";
import { SignalTile } from "./SignalTile";
import { WeekSparkline } from "./WeekSparkline";
import {
  paceCaption, sleepDeltaCaption, hrvDeltaCaption, rhrDeltaCaption,
  formatHoursMinutes,
} from "@/lib/dashboard/captions";

/**
 * Narrative-led signals dashboard.
 *
 * Top: a sentence Vita wrote this morning about sleep, HRV, the day ahead.
 * Below: 6 tiles (steps, active minutes, sleep, HRV, resting HR, energy)
 * with ghost variants for any metric the user's connected wearable doesn't
 * supply, so the absence is visible and clickable.
 * Below that: 7-day step sparkline and an expandable details panel.
 *
 * The actual habit list (wearable + manual) stays in TodayView so we don't
 * duplicate completion/edit machinery.
 */

export type SignalsData = {
  headline: string;
  isApplehealthConnected: boolean;
  // Today's metrics. null = HealthDaily row missing for that (date, metric).
  today: {
    steps: number | null;
    activeMinutes: number | null;
    caloriesActive: number | null;
    sleepHours: number | null;
    hrvMs: number | null;
    restingHr: number | null;
  };
  // 7-day baseline averages (for delta captions). null = insufficient data.
  baseline: {
    sleepHours: number | null;
    hrvMs: number | null;
    restingHr: number | null;
  };
  // Wearable habit targets — used to draw the progress bars on tiles. The
  // dashboard prefers a user-set target (their actual habit) over the
  // generic 10,000 / 30 default.
  targets: {
    steps: number | null;
    activeMinutes: number | null;
  };
  // Last 7 days of steps, [oldest, ..., today]. Each entry is `null` for
  // missing days.
  stepsLast7: { date: string; value: number | null }[];
};

export function SignalsSection({ data }: { data: SignalsData }) {
  const t = data.today;
  const b = data.baseline;
  const stepsTarget = data.targets.steps ?? 10000;
  const activeMinTarget = data.targets.activeMinutes ?? 30;
  const now = new Date();

  return (
    <section className="space-y-6">
      {/* Headline */}
      <p className="font-serif text-body-lg font-light text-text-primary leading-snug">
        {data.headline}
      </p>

      <SectionLabel>
        Today&apos;s signals · {countConnected(t)} of 6 connected
      </SectionLabel>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {t.steps !== null ? (
          <SignalTile
            variant="progress"
            icon={Footprints}
            label="Steps"
            value={Math.round(t.steps).toLocaleString()}
            current={t.steps}
            target={stepsTarget}
            caption={paceCaption(t.steps, stepsTarget, now, "steps")}
          />
        ) : (
          <SignalTile
            variant="empty"
            icon={Footprints}
            label="Steps"
            connectHref={connectHref(data.isApplehealthConnected)}
          />
        )}

        {t.activeMinutes !== null ? (
          <SignalTile
            variant="progress"
            icon={Activity}
            label="Active min"
            value={`${Math.round(t.activeMinutes)}`}
            current={t.activeMinutes}
            target={activeMinTarget}
            caption={paceCaption(t.activeMinutes, activeMinTarget, now, "min")}
          />
        ) : (
          <SignalTile
            variant="empty"
            icon={Activity}
            label="Active min"
            connectHref={connectHref(data.isApplehealthConnected)}
          />
        )}

        {t.sleepHours !== null ? (
          <SignalTile
            variant="value"
            icon={Moon}
            label="Sleep"
            value={formatHoursMinutes(t.sleepHours)}
            caption={sleepDeltaCaption(t.sleepHours, b.sleepHours)}
          />
        ) : (
          <SignalTile
            variant="empty"
            icon={Moon}
            label="Sleep"
            connectHref={connectHref(data.isApplehealthConnected)}
          />
        )}

        {t.hrvMs !== null ? (
          <SignalTile
            variant="value"
            icon={Zap}
            label="HRV"
            value={`${Math.round(t.hrvMs)} ms`}
            caption={hrvDeltaCaption(t.hrvMs, b.hrvMs)}
          />
        ) : (
          <SignalTile
            variant="empty"
            icon={Zap}
            label="HRV"
            connectHref={connectHref(data.isApplehealthConnected)}
          />
        )}

        {t.restingHr !== null ? (
          <SignalTile
            variant="value"
            icon={Heart}
            label="Resting HR"
            value={`${Math.round(t.restingHr)} bpm`}
            caption={rhrDeltaCaption(t.restingHr, b.restingHr)}
          />
        ) : (
          <SignalTile
            variant="empty"
            icon={Heart}
            label="Resting HR"
            connectHref={connectHref(data.isApplehealthConnected)}
          />
        )}

        {t.caloriesActive !== null ? (
          <SignalTile
            variant="value"
            icon={Flame}
            label="Energy"
            value={`${Math.round(t.caloriesActive)} kcal`}
          />
        ) : (
          <SignalTile
            variant="empty"
            icon={Flame}
            label="Energy"
            connectHref={connectHref(data.isApplehealthConnected)}
          />
        )}
      </div>

      {/* This week — only render if we actually have any data */}
      {hasAny(data.stepsLast7) ? (
        <div className="space-y-2.5">
          <SectionLabel>This week</SectionLabel>
          <WeekSparkline days={data.stepsLast7} target={stepsTarget} unit="steps" />
        </div>
      ) : null}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
      {children}
    </p>
  );
}

function countConnected(t: SignalsData["today"]): number {
  return (Object.values(t) as (number | null)[]).filter((v) => v !== null).length;
}

function hasAny(rows: { value: number | null }[]): boolean {
  return rows.some((r) => r.value !== null && r.value > 0);
}

function connectHref(connected: boolean): string {
  return connected ? "/settings/integrations/apple-health" : "/settings/wearables";
}

void Link; // reserved for future expandable details panel
