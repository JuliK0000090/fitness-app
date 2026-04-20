"use client";

import { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceModeProps {
  onClose: () => void;
  onTranscript: (text: string) => void;
}

export function VoiceMode({ onClose, onTranscript }: VoiceModeProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "processing">("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(final || interim);
      if (final) {
        setStatus("processing");
        recognition.stop();
        onTranscript(final.trim());
        setTimeout(() => { setTranscript(""); setStatus("idle"); }, 500);
      }
    };

    recognition.onend = () => { setListening(false); setStatus("idle"); };
    recognitionRef.current = recognition;
  }, [onTranscript]);

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      setStatus("idle");
    } else {
      recognitionRef.current.start();
      setListening(true);
      setStatus("listening");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary">
        <X size={20} />
      </button>

      {/* Animated orb */}
      <div
        onClick={toggleListening}
        className={cn(
          "relative w-32 h-32 rounded-full cursor-pointer transition-all duration-300",
          "flex items-center justify-center",
          listening ? "scale-110" : "scale-100"
        )}
        style={{
          background: listening
            ? "conic-gradient(from 0deg, #A78BFA, #22D3EE, #F472B6, #A78BFA)"
            : "radial-gradient(circle, rgba(167,139,250,0.3), rgba(34,211,238,0.1))",
          boxShadow: listening
            ? "0 0 60px rgba(167,139,250,0.5), 0 0 120px rgba(34,211,238,0.2)"
            : "0 0 30px rgba(167,139,250,0.2)",
          animation: listening ? "spin 3s linear infinite" : "none",
        }}
      >
        <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
          {listening ? (
            <MicOff size={28} className="text-primary" />
          ) : (
            <Mic size={28} className="text-muted-foreground" />
          )}
        </div>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        {status === "idle" && "Tap to speak"}
        {status === "listening" && "Listening…"}
        {status === "processing" && "Processing…"}
      </p>

      {transcript && (
        <p className="mt-4 text-base text-foreground max-w-sm text-center px-4 fu">{transcript}</p>
      )}

      <p className="mt-6 text-xs text-muted-foreground">Tap again or press Escape to stop</p>
    </div>
  );
}
