"use client";

import { useState } from "react";
import { Activity, Camera, Video } from "lucide-react";
import { MeasurementCard } from "@/components/cards/MeasurementCard";
import { BodyMapCard } from "@/components/cards/BodyMapCard";
import { PhotoMeasure } from "@/components/vision/PhotoMeasure";
import { FormCheck } from "@/components/vision/FormCheck";
import { format } from "date-fns";

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

interface BodyViewProps {
  measurements: Measurement[];
  photos: Photo[];
}

const TABS = ["Stats", "Photos", "Body Map", "Vision"] as const;

export function BodyView({ measurements, photos }: BodyViewProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Stats");
  const [formCheckOpen, setFormCheckOpen] = useState(false);

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-4">
      <div className="flex items-center gap-3 fu">
        <div className="w-9 h-9 rounded-2xl bg-[#22D3EE]/20 flex items-center justify-center">
          <Activity size={18} className="text-[#22D3EE]" />
        </div>
        <h1 className="text-lg font-bold">Body</h1>
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

      {tab === "Stats" && (
        <div className="space-y-2 fu">
          {measurements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No measurements yet. Ask Vita to log one.</p>
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
        <div className="fu">
          {photos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Camera size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No progress photos yet.</p>
              <p className="text-xs mt-1">Send a photo to Vita to start tracking.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((p) => (
                <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.pose} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50">
                    <p className="text-[9px] text-white text-center">{format(new Date(p.capturedAt), "MMM d")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Body Map" && (
        <div className="fu">
          <BodyMapCard worked={[]} sore={[]} />
          <p className="text-xs text-muted-foreground text-center mt-2">
            Muscle map will highlight worked and sore areas based on your logged workouts.
          </p>
        </div>
      )}

      {tab === "Vision" && (
        <div className="space-y-4 fu">
          {/* Form Check */}
          <button
            onClick={() => setFormCheckOpen(true)}
            className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-[#34D399]/20 flex items-center justify-center shrink-0">
              <Video size={16} className="text-[#34D399]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Form Check</p>
              <p className="text-xs text-muted-foreground">Live camera with rep counter and alignment grid</p>
            </div>
          </button>

          {/* Photo Measurements */}
          <div className="glass rounded-2xl p-4">
            <PhotoMeasure />
          </div>
        </div>
      )}

      {/* Form check overlay */}
      {formCheckOpen && <FormCheck onClose={() => setFormCheckOpen(false)} />}
    </div>
  );
}
