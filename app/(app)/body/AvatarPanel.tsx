"use client";

import { useState, useCallback } from "react";
import { ChevronRight, Sparkles, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AvatarDefinition, Archetype, SkinTone, HairStyle, HairColor, PoseId } from "@/lib/avatar/types";
import { SKIN_TONES } from "@/lib/avatar/types";

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface AvatarPanelProps {
  definition: AvatarDefinition;
  visibility: "ON" | "LIMITED" | "OFF";
  style: "ABSTRACT" | "ILLUSTRATED";
  milestones: Milestone[];
  events: AvatarEvent[];
  avatarSvg: string; // pre-rendered current avatar SVG
  milestoneSvgs: Record<string, string>; // milestone id → SVG
  eventSvgs: Record<string, string>;
}

// ── Avatar display ────────────────────────────────────────────────────────────

function AvatarImage({ svg, size = 160, className }: { svg: string; size?: number; className?: string }) {
  const encoded = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={encoded}
      alt="Your Vita avatar"
      width={size}
      height={Math.round(size * 1.75)}
      className={cn("object-contain", className)}
    />
  );
}

// ── Milestone card ────────────────────────────────────────────────────────────

function MilestoneCard({
  milestone, svg, isActive, onClick,
}: {
  milestone: Milestone;
  svg: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-all shrink-0 w-[80px]",
        isActive ? "bg-white/[0.08]" : "opacity-60 hover:opacity-80"
      )}
    >
      <AvatarImage svg={svg} size={64} />
      <p className="text-[9px] text-white/50 text-center leading-tight">{milestone.label}</p>
      {milestone.predicted && (
        <span className="text-[8px] text-white/25 uppercase tracking-wider">projected</span>
      )}
    </button>
  );
}

// ── Archetype picker ──────────────────────────────────────────────────────────

const ARCHETYPES: { value: Archetype; label: string; desc: string }[] = [
  { value: "hourglass",         label: "Hourglass",           desc: "Balanced shoulders & hips, defined waist" },
  { value: "pear",              label: "Pear",                desc: "Hips wider than shoulders" },
  { value: "rectangle",         label: "Rectangle",           desc: "Athletic, straight through the waist" },
  { value: "inverted_triangle", label: "Inverted triangle",   desc: "Shoulders wider than hips" },
  { value: "apple",             label: "Apple",               desc: "Fuller midsection" },
];

const HAIR_STYLES: { value: HairStyle; label: string }[] = [
  { value: "long_wavy",     label: "Long wavy" },
  { value: "long_straight", label: "Long straight" },
  { value: "curly_medium",  label: "Curly" },
  { value: "ponytail",      label: "Ponytail" },
  { value: "bun",           label: "Bun" },
  { value: "braids",        label: "Braids" },
  { value: "short_straight",label: "Short straight" },
  { value: "pixie",         label: "Pixie" },
];

const HAIR_COLORS: { value: HairColor; label: string; hex: string }[] = [
  { value: "black",  label: "Black",  hex: "#1A1A1A" },
  { value: "brown",  label: "Brown",  hex: "#5C3317" },
  { value: "blonde", label: "Blonde", hex: "#C9A84C" },
  { value: "red",    label: "Red",    hex: "#8B2500" },
  { value: "grey",   label: "Grey",   hex: "#A0A0A0" },
];

// ── Main panel ────────────────────────────────────────────────────────────────

export function AvatarPanel({
  definition: initDef,
  visibility: initVisibility,
  milestones,
  avatarSvg: initSvg,
  milestoneSvgs,
  eventSvgs,
  events,
}: AvatarPanelProps) {
  const [def, setDef] = useState(initDef);
  const [visibility, setVisibility] = useState(initVisibility);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(
    milestones[0]?.id ?? null
  );
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  const patchAvatar = useCallback(async (
    updates: Partial<AvatarDefinition>,
    settingsUpdates?: { visibility?: "ON" | "LIMITED" | "OFF" }
  ) => {
    setSaving(true);
    try {
      await fetch("/api/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ definition: updates, ...settingsUpdates }),
      });
    } catch {
      toast.error("Could not save — try again");
    } finally {
      setSaving(false);
    }
  }, []);

  function updateDef(updates: Partial<AvatarDefinition>) {
    const newDef = { ...def, ...updates };
    setDef(newDef);
    patchAvatar(updates);
  }

  async function hideAvatar() {
    setVisibility("OFF");
    await patchAvatar({}, { visibility: "OFF" });
    toast.success("Avatar hidden. You can restore it in settings.");
  }

  if (visibility === "OFF") {
    return (
      <div className="py-12 text-center space-y-3">
        <EyeOff size={28} className="mx-auto text-white/20" />
        <p className="text-sm text-white/40">Your avatar is hidden.</p>
        <button
          onClick={async () => {
            setVisibility("ON");
            await patchAvatar({}, { visibility: "ON" });
          }}
          className="text-xs text-white/50 underline underline-offset-2"
        >
          Show again
        </button>
      </div>
    );
  }

  const activeMilestone = milestones.find((m) => m.id === activeMilestoneId) ?? milestones[0];
  const activeSvg = activeMilestoneId ? (milestoneSvgs[activeMilestoneId] ?? initSvg) : initSvg;

  return (
    <div className="space-y-5">

      {/* Hero avatar */}
      <div className="glass rounded-3xl p-5 flex flex-col items-center gap-3">
        <p className="text-[9px] tracking-[0.25em] uppercase text-white/25">vita you</p>

        <div className="relative">
          <AvatarImage svg={activeSvg} size={160} className="drop-shadow-2xl" />
          {/* Subtle glow halo behind avatar */}
          <div
            className="absolute inset-0 -z-10 rounded-full blur-3xl opacity-20"
            style={{ background: "radial-gradient(ellipse, rgba(167,139,250,0.6), transparent 70%)" }}
          />
        </div>

        {activeMilestone && (
          <div className="text-center">
            <p className="text-xs font-medium text-white/70">{activeMilestone.label}</p>
            {activeMilestone.note && (
              <p className="text-[10px] text-white/35 mt-0.5">{activeMilestone.note}</p>
            )}
          </div>
        )}
      </div>

      {/* Milestone timeline */}
      {milestones.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">your journey</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {milestones.map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                svg={milestoneSvgs[m.id] ?? initSvg}
                isActive={m.id === activeMilestoneId}
                onClick={() => setActiveMilestoneId(m.id)}
              />
            ))}
          </div>
          <p className="text-[9px] text-white/20 text-center">
            Tap a milestone to preview · timeline moves forward, never back
          </p>
        </div>
      )}

      {/* Dress rehearsal events */}
      {events.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">the rehearsal</p>
          {events.map((ev) => (
            <div key={ev.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <AvatarImage svg={eventSvgs[ev.id] ?? initSvg} size={56} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/75">{ev.title}</p>
                <p className="text-[10px] text-white/35">
                  {new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                {ev.note && <p className="text-[10px] text-white/25 mt-0.5">{ev.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customize button */}
      <button
        onClick={() => setShowSettings((s) => !s)}
        className="w-full glass rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors"
      >
        <Sparkles size={14} />
        <span className="flex-1 text-left">Customize your avatar</span>
        <ChevronRight size={14} className={cn("transition-transform", showSettings && "rotate-90")} />
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div className="glass rounded-2xl p-4 space-y-5">

          {/* Archetype */}
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">body shape</p>
            <div className="space-y-1">
              {ARCHETYPES.map((a) => (
                <button
                  key={a.value}
                  onClick={() => updateDef({ archetype: a.value })}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl border transition-colors",
                    def.archetype === a.value
                      ? "border-white/30 bg-white/[0.06] text-white/80"
                      : "border-white/[0.05] text-white/40 hover:border-white/15"
                  )}
                >
                  <p className="text-xs font-medium">{a.label}</p>
                  <p className="text-[10px] text-white/30">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Skin tone */}
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">skin tone</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(SKIN_TONES) as [string, string][]).map(([tone, hex]) => {
                const toneNum = parseInt(tone) as SkinTone;
                return (
                  <button
                    key={tone}
                    onClick={() => updateDef({ skinTone: toneNum })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      def.skinTone === toneNum ? "border-white/60 scale-110" : "border-white/10"
                    )}
                    style={{ backgroundColor: hex }}
                    aria-label={`Skin tone ${tone}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Hair style */}
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">hair style</p>
            <div className="flex gap-1.5 flex-wrap">
              {HAIR_STYLES.map((h) => (
                <button
                  key={h.value}
                  onClick={() => updateDef({ hairStyle: h.value })}
                  className={cn(
                    "text-[10px] px-2.5 py-1 rounded-full border transition-colors",
                    def.hairStyle === h.value
                      ? "border-white/30 bg-white/[0.06] text-white/70"
                      : "border-white/[0.06] text-white/30"
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hair color */}
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">hair color</p>
            <div className="flex gap-2 flex-wrap">
              {HAIR_COLORS.map((h) => (
                <button
                  key={h.value}
                  onClick={() => updateDef({ hairColor: h.value })}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    def.hairColor === h.value ? "border-white/60 scale-110" : "border-white/10"
                  )}
                  style={{ backgroundColor: h.hex }}
                  aria-label={h.label}
                />
              ))}
            </div>
          </div>

          {/* Height */}
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">height</p>
            <div className="flex gap-2">
              {(["short", "medium", "tall"] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => updateDef({ height: h })}
                  className={cn(
                    "flex-1 text-xs py-1.5 rounded-lg border transition-colors",
                    def.height === h
                      ? "border-white/30 bg-white/[0.06] text-white/70"
                      : "border-white/[0.05] text-white/35"
                  )}
                >
                  {h.charAt(0).toUpperCase() + h.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Frame */}
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">frame</p>
            <div className="flex gap-2">
              {(["petite", "medium", "strong"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => updateDef({ frame: f })}
                  className={cn(
                    "flex-1 text-xs py-1.5 rounded-lg border transition-colors",
                    def.frame === f
                      ? "border-white/30 bg-white/[0.06] text-white/70"
                      : "border-white/[0.05] text-white/35"
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Pose */}
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/25">pose</p>
            <div className="flex gap-1.5 flex-wrap">
              {(["standing", "hands_on_hips", "arms_crossed", "striding", "pilates", "seated"] as PoseId[]).map((p) => (
                <button
                  key={p}
                  onClick={() => updateDef({ pose: p })}
                  className={cn(
                    "text-[10px] px-2.5 py-1 rounded-full border transition-colors",
                    def.pose === p
                      ? "border-white/30 bg-white/[0.06] text-white/70"
                      : "border-white/[0.06] text-white/30"
                  )}
                >
                  {p.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Divider + danger zone */}
          <div className="border-t border-white/[0.05] pt-3">
            <button
              onClick={hideAvatar}
              disabled={saving}
              className="text-[11px] text-white/25 hover:text-white/40 transition-colors"
            >
              Hide avatar entirely
            </button>
          </div>

        </div>
      )}

      {saving && (
        <p className="text-[10px] text-white/20 text-center">saving…</p>
      )}
    </div>
  );
}
