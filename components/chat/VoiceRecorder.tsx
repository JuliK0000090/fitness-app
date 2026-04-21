"use client";

import { useState, useRef } from "react";
import { Mic, Square, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onRecorded: (file: File) => void;
}

export function VoiceRecorder({ onRecorded }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Microphone not available in this browser.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // iOS Safari only supports audio/mp4; Chrome/Firefox support audio/webm
    const mimeType =
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const type = mimeType || "audio/webm";

    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type });
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
      onRecorded(file);
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start();
    setRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      className={cn(
        "p-2 rounded-xl transition-colors",
        recording
          ? "bg-destructive text-white animate-pulse"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
      title={recording ? `Stop recording (${fmt(seconds)})` : "Record voice message"}
    >
      {recording ? <Square size={14} /> : <Mic size={14} />}
    </button>
  );
}
