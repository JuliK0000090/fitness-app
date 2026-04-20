"use client";

import { useState, useRef } from "react";
import { Upload, Ruler, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EstimatedMeasurements {
  weightKg?: number;
  bodyFatPct?: number;
  shoulderWidthCm?: number;
  waistCm?: number;
  hipsCm?: number;
  confidence: "low" | "medium" | "high";
  notes: string;
}

interface PhotoMeasureProps {
  heightCm?: number;
  onSave?: (measurements: EstimatedMeasurements) => void;
}

export function PhotoMeasure({ heightCm, onSave }: PhotoMeasureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [results, setResults] = useState<EstimatedMeasurements | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setResults(null);
  }

  async function estimate() {
    if (!previewUrl) return;
    setEstimating(true);

    try {
      // Upload photo and get AI measurement estimates
      const blob = await fetch(previewUrl).then((r) => r.blob());
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");

      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();

      // Call measurement estimation endpoint
      const estimateRes = await fetch("/api/vision/estimate-measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: uploadData.url, heightCm }),
      });

      if (estimateRes.ok) {
        const data = await estimateRes.json();
        setResults(data.measurements);
      } else {
        toast.error("Could not estimate measurements from this photo.");
      }
    } catch {
      toast.error("Estimation failed. Try a clearer full-body photo.");
    } finally {
      setEstimating(false);
    }
  }

  const confidenceColor = {
    low: "text-white/50",
    medium: "text-white/50",
    high: "text-white/50",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center">
          <Ruler size={16} className="text-white/50" />
        </div>
        <div>
          <p className="text-sm font-semibold">Photo Measurements</p>
          <p className="text-[10px] text-muted-foreground">AI-estimated body measurements from a photo</p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
          previewUrl ? "border-white/[0.07]" : "border-border hover:border-white/[0.07]"
        }`}
        style={{ minHeight: previewUrl ? "auto" : "120px" }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain bg-black" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Upload size={24} className="opacity-50" />
            <p className="text-xs">Tap to upload a full-body photo</p>
            <p className="text-[10px] opacity-60">Front-facing, standing, neutral pose</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {previewUrl && !results && (
        <button
          onClick={estimate}
          disabled={estimating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] text-white/50 text-sm font-medium hover:bg-white/[0.06] transition-colors disabled:opacity-50"
        >
          {estimating ? <Loader2 size={14} className="animate-spin" /> : <Ruler size={14} />}
          {estimating ? "Analyzing…" : "Estimate measurements"}
        </button>
      )}

      {/* Results */}
      {results && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Estimated measurements</p>
            <span className={`text-[10px] font-medium ${confidenceColor[results.confidence]}`}>
              {results.confidence} confidence
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Weight", value: results.weightKg, unit: "kg" },
              { label: "Body fat", value: results.bodyFatPct, unit: "%" },
              { label: "Waist", value: results.waistCm, unit: "cm" },
              { label: "Hips", value: results.hipsCm, unit: "cm" },
              { label: "Shoulders", value: results.shoulderWidthCm, unit: "cm" },
            ].filter((m) => m.value !== undefined).map((m) => (
              <div key={m.label} className="bg-secondary rounded-xl p-2.5">
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                <p className="text-base font-bold">{m.value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{m.unit}</span></p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed border-l-2 border-white/[0.07] pl-2">{results.notes}</p>

          <p className="text-[10px] text-muted-foreground">⚠ These are rough estimates. For accurate measurements, use a tape measure.</p>

          {onSave && (
            <button
              onClick={() => onSave(results)}
              className="w-full py-1.5 rounded-xl bg-white/[0.04] text-white/50 text-xs font-medium hover:bg-white/[0.06] transition-colors"
            >
              Save to measurements
            </button>
          )}
        </div>
      )}
    </div>
  );
}
