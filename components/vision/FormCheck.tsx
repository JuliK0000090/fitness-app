"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, CameraOff, Activity, X } from "lucide-react";

interface RepCount {
  exercise: string;
  count: number;
}

interface FormCheckProps {
  onClose: () => void;
}

// Simple heuristic rep counter using pose landmark Y deltas
// In production this would use @mediapipe/tasks-vision PoseLandmarker
function useRepCounter(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [reps, setReps] = useState<RepCount>({ exercise: "Squat", count: 0 });
  const stateRef = useRef<"up" | "down">("up");
  const animRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tick = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) return;

    // Placeholder: in production, use MediaPipe PoseLandmarker here
    // For now we just show the camera feed and let users self-count
    animRef.current = requestAnimationFrame(tick);
  }, [videoRef]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [tick]);

  return { reps, canvasRef };
}

export function FormCheck({ onClose }: FormCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualReps, setManualReps] = useState(0);
  const [exercise, setExercise] = useState("Squat");
  const { reps } = useRepCounter(videoRef);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreaming(true);
        }
      } catch {
        setError("Camera access denied or not available.");
      }
    }
    startCamera();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const EXERCISES = ["Squat", "Push-up", "Deadlift", "Lunge", "Plank", "Pull-up"];

  return (
    <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-[#34D399]/20 flex items-center justify-center">
          <Activity size={16} className="text-[#34D399]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Form Check</p>
          <p className="text-[10px] text-muted-foreground">Live camera feedback</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary">
          <X size={18} />
        </button>
      </div>

      {/* Camera feed */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <CameraOff size={40} className="opacity-40" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {!streaming && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#34D399] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Overlay grid for form alignment */}
            {streaming && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Rule-of-thirds grid */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-white/30" />
                  ))}
                </div>
                {/* Center crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-[#34D399]/60" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#34D399]/60" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-4 space-y-3 bg-background/95">
        {/* Exercise selector */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {EXERCISES.map((e) => (
            <button
              key={e}
              onClick={() => setExercise(e)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors ${
                exercise === e ? "bg-[#34D399]/20 text-[#34D399]" : "bg-secondary text-muted-foreground"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Rep counter */}
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{exercise} reps</p>
            <p className="text-4xl font-black text-[#34D399]">{manualReps}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setManualReps((r) => Math.max(0, r - 1))}
              className="w-12 h-12 rounded-2xl bg-secondary text-xl font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              −
            </button>
            <button
              onClick={() => setManualReps((r) => r + 1)}
              className="w-12 h-12 rounded-2xl bg-[#34D399]/10 text-xl font-bold text-[#34D399] hover:bg-[#34D399]/20 transition-colors"
            >
              +
            </button>
          </div>
          <button
            onClick={() => setManualReps(0)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Position yourself so your full body is visible. Tap + for each rep completed.
        </p>
      </div>
    </div>
  );
}
