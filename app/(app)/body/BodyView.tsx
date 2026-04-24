"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { MeasurementCard } from "@/components/cards/MeasurementCard";
import { BodyMapCard } from "@/components/cards/BodyMapCard";
import { PhotoMeasure } from "@/components/vision/PhotoMeasure";
import { FormCheck } from "@/components/vision/FormCheck";
import { format } from "date-fns";
import { AvatarPanel } from "./AvatarPanel";
import type { AvatarDefinition } from "@/lib/avatar/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

interface Measurement {
  id: string;
  kind: string;
  value: number;
  unit: string;
  capturedAt: string;
  history: { value: number; capturedAt: string }[];
}

interface Photo {
  id: string;
  url: string;
  pose: string;
  capturedAt: string;
}

interface Milestone {
  id: string;
  date: string;
  label: string;
  evolution: number;
  glow: number;
  pose: string;
  note: string | null;
  predicted: boolean;
}

interface AvatarEvent {
  id: string;
  title: string;
  date: string;
  outfit: string;
  background: string;
  pose: string;
  note: string | null;
}

interface AvatarProps {
  definition: AvatarDefinition;
  visibility: "ON" | "LIMITED" | "OFF";
  style: "ABSTRACT" | "ILLUSTRATED";
  milestones: Milestone[];
  events: AvatarEvent[];
  avatarSvg: string;
  milestoneSvgs: Record<string, string>;
  eventSvgs: Record<string, string>;
}

interface BodyViewProps {
  measurements: Measurement[];
  photos: Photo[];
  avatarProps: AvatarProps;
}

const TABS = ["Vita You", "Stats", "Photos", "Body Map"] as const;

export function BodyView({ measurements, photos, avatarProps }: BodyViewProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Vita You");
  const [formCheckOpen, setFormCheckOpen] = useState(false);

  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-8">
      <PageHeader
        eyebrow="Progress"
        title="Body"
        rule={true}
      />

      {/* Tab bar */}
      <div className="flex border-b border-border-subtle">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 pb-2.5 text-caption font-sans font-medium transition-colors border-b-[1.5px] -mb-px",
              tab === t
                ? "text-text-primary border-champagne"
                : "text-text-disabled border-transparent hover:text-text-muted"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Vita You" && (
        <AvatarPanel {...avatarProps} />
      )}

      {tab === "Stats" && (
        <div className="space-y-2">
          {measurements.length === 0 ? (
            <p className="text-body-sm text-text-muted text-center py-12">
              No measurements yet. Ask Vita to log one.
            </p>
          ) : (
            measurements.map((m) => (
              <MeasurementCard
                key={m.id}
                metricType={m.kind}
                value={m.value}
                unit={m.unit}
                delta={m.history.length >= 2 ? m.value - m.history[1].value : undefined}
                history={m.history.map((h) => ({ value: h.value }))}
              />
            ))
          )}
        </div>
      )}

      {tab === "Photos" && (
        <div>
          {photos.length === 0 ? (
            <div className="text-center py-16">
              <Camera size={24} strokeWidth={1.5} className="mx-auto mb-4 text-text-disabled" />
              <p className="text-body-sm text-text-muted">No progress photos yet.</p>
              <p className="text-caption text-text-disabled mt-1">Send a photo to Vita to start tracking.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((p) => (
                <div key={p.id} className="relative aspect-square rounded overflow-hidden bg-bg-surface border border-border-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.pose} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-bg-base/80">
                    <p className="text-[9px] text-text-muted text-center">{format(new Date(p.capturedAt), "MMM d")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Body Map" && (
        <div className="space-y-4">
          <BodyMapCard worked={[]} sore={[]} />
          <p className="text-caption text-text-disabled text-center">
            Highlights worked and sore muscle groups based on your logged workouts.
          </p>
        </div>
      )}

      {formCheckOpen && <FormCheck onClose={() => setFormCheckOpen(false)} />}
    </div>
  );
}
