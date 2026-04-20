"use client";

import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw } from "lucide-react";

interface TimerCardProps {
  durationSec: number;
  label?: string;
  onComplete?: () => void;
}

export function TimerCard({ durationSec, label = "Rest Timer", onComplete }: TimerCardProps) {
  const [remaining, setRemaining] = useState(durationSec);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setDone(true);
            // TTS on complete
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              const utt = new SpeechSynthesisUtterance(`${label} complete!`);
              window.speechSynthesis.speak(utt);
            }
            onComplete?.();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, label, onComplete]);

  function reset() {
    clearInterval(intervalRef.current!);
    setRemaining(durationSec);
    setRunning(false);
    setDone(false);
  }

  const pct = ((durationSec - remaining) / durationSec) * 100;
  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");
  const circumference = 2 * Math.PI * 36;

  return (
    <div className="glass rounded-2xl p-4 space-y-3 my-2 fu border border-white/[0.07]">
      <div className="flex items-center gap-2">
        <div className="border border-white/[0.07] w-8 h-8 rounded-xl flex items-center justify-center">
          <Timer size={16} className="text-white/50" />
        </div>
        <p className="text-sm font-semibold">{label}</p>
        {done && <span className="ml-auto text-xs text-white/60 font-semibold">Done!</span>}
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Circular progress */}
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle
              cx="40" cy="40" r="36"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (circumference * pct) / 100}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold tabular-nums">{mins}:{secs}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            disabled={done}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white/[0.05] text-white/60 hover:bg-white/10 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {running ? <Pause size={12} /> : <Play size={12} />}
            {running ? "Pause" : "Start"}
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
