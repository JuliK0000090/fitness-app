/**
 * Vita Avatar Renderer — Abstract Style (MVP)
 *
 * Pure SVG generation from AvatarDefinition parameters.
 * No external assets required. Illustrated style (with commissioned
 * SVG assets) can be layered in later by adding an asset-based
 * render path alongside this one.
 *
 * ViewBox: 0 0 400 700
 * All coordinates are in that space.
 */

import type {
  AvatarDefinition, Archetype, PoseId, HairStyle,
} from "./types";
import { SKIN_TONES, HAIR_COLORS, BACKGROUND_GRADIENTS } from "./types";

// ── Archetype geometry ────────────────────────────────────────────────────────
// Each archetype defines the half-widths at key y positions.
// The silhouette is mirrored around x=200 (center).

interface ArchetypeShape {
  shoulderHalf: number; // half-width at shoulder line
  waistHalf: number;    // half-width at waist
  hipHalf: number;      // half-width at hip
  legHalf: number;      // half-width of each leg at mid-thigh
}

const ARCHETYPES: Record<Archetype, ArchetypeShape> = {
  rectangle:         { shoulderHalf: 62, waistHalf: 55,  hipHalf: 60,  legHalf: 26 },
  hourglass:         { shoulderHalf: 65, waistHalf: 44,  hipHalf: 65,  legHalf: 26 },
  pear:              { shoulderHalf: 52, waistHalf: 48,  hipHalf: 70,  legHalf: 28 },
  inverted_triangle: { shoulderHalf: 72, waistHalf: 56,  hipHalf: 54,  legHalf: 24 },
  apple:             { shoulderHalf: 62, waistHalf: 66,  hipHalf: 60,  legHalf: 26 },
};

// ── Y positions (in 0–700 viewBox) ────────────────────────────────────────────
const Y = {
  headTop:      48,
  headCenter:   100,
  headBottom:   150,
  neckBottom:   175,
  shoulder:     200,
  waist:        330,
  hip:          385,
  thigh:        470,
  knee:         530,
  ankle:        635,
  ground:       655,
};

// ── Evolution modifiers ───────────────────────────────────────────────────────
// evolution 0–4: posture lift (negative = more upright/taller feel)
function evolutionPostureLift(evolution: number): number {
  return -evolution * 4; // subtle upward shift
}

function evolutionStanceWidth(evolution: number): number {
  return evolution * 4; // feet spread a bit wider = more confident
}

// ── Path builders ─────────────────────────────────────────────────────────────

function buildBodyPath(shape: ArchetypeShape, evolution: number): string {
  const cx = 200;
  const postureShift = evolutionPostureLift(evolution);
  const stanceExtra = evolutionStanceWidth(evolution);

  const sh = shape.shoulderHalf;
  const wh = shape.waistHalf;
  const hh = shape.hipHalf;
  const lh = shape.legHalf + stanceExtra * 0.3;

  // Y coords shifted for posture
  const yNeck    = Y.neckBottom    + postureShift;
  const yShoulder= Y.shoulder      + postureShift;
  const yWaist   = Y.waist         + postureShift;
  const yHip     = Y.hip           + postureShift;
  const yThigh   = Y.thigh         + postureShift;
  const yKnee    = Y.knee          + postureShift;
  const yAnkle   = Y.ankle;
  const yGround  = Y.ground;

  // Left leg offset from center (stance)
  const legGap = 18 + stanceExtra;

  // Build the silhouette as a single closed path (no separate legs for abstract)
  // Left side going down, right side coming up
  const path = [
    // Start at left shoulder
    `M ${cx - sh} ${yShoulder}`,
    // Shoulder curve up to neck
    `Q ${cx - sh + 8} ${yNeck} ${cx - 16} ${yNeck}`,
    // Right side: neck to right shoulder
    `Q ${cx + 16} ${yNeck} ${cx + sh} ${yShoulder}`,
    // Right torso down to waist (cubic bezier for curve)
    `C ${cx + sh + 4} ${yShoulder + 60} ${cx + wh + 4} ${yWaist - 20} ${cx + wh} ${yWaist}`,
    // Right hip flare
    `C ${cx + wh - 2} ${yWaist + 30} ${cx + hh + 2} ${yHip - 20} ${cx + hh} ${yHip}`,
    // Right outer thigh
    `L ${cx + legGap + lh} ${yThigh}`,
    // Right outer leg
    `L ${cx + legGap + lh - 6} ${yKnee}`,
    `L ${cx + legGap + lh - 8} ${yAnkle}`,
    // Right foot
    `L ${cx + legGap + lh + 4} ${yGround}`,
    // Inner right leg back up to crotch
    `L ${cx + legGap - lh + 12} ${yGround}`,
    `L ${cx + legGap - lh + 4} ${yAnkle}`,
    `L ${cx + legGap - lh} ${yKnee}`,
    `L ${cx + legGap - lh} ${yThigh}`,
    // Crotch (bottom of hips, inner)
    `L ${cx - legGap + lh} ${yThigh}`,
    // Inner left leg
    `L ${cx - legGap + lh} ${yKnee}`,
    `L ${cx - legGap + lh + 4} ${yAnkle}`,
    `L ${cx - legGap + lh - 12} ${yGround}`,
    // Left foot
    `L ${cx - legGap - lh - 4} ${yGround}`,
    `L ${cx - legGap - lh + 8} ${yAnkle}`,
    `L ${cx - legGap - lh + 6} ${yKnee}`,
    `L ${cx - legGap - lh} ${yThigh}`,
    // Left outer hip back up
    `L ${cx - hh} ${yHip}`,
    `C ${cx - hh - 2} ${yHip - 20} ${cx - wh - 4} ${yWaist + 30} ${cx - wh} ${yWaist}`,
    // Left torso back up to shoulder
    `C ${cx - wh - 4} ${yWaist - 20} ${cx - sh - 4} ${yShoulder + 60} ${cx - sh} ${yShoulder}`,
    `Z`,
  ].join(" ");

  return path;
}

function buildHeadPath(evolution: number): string {
  const cx = 200;
  const postureShift = evolutionPostureLift(evolution);
  const cy = Y.headCenter + postureShift;
  // Slightly elongated oval (fashion proportion: taller than wide)
  return `<ellipse cx="${cx}" cy="${cy}" rx="42" ry="52" />`;
}

function buildHairPath(style: HairStyle, evolution: number): string {
  const cx = 200;
  const postureShift = evolutionPostureLift(evolution);
  const headTop = Y.headTop + postureShift;
  const headCy  = Y.headCenter + postureShift;

  switch (style) {
    case "bun":
      return `
        <ellipse cx="${cx}" cy="${headTop - 22}" rx="28" ry="24" />
        <ellipse cx="${cx}" cy="${headTop - 2}" rx="22" ry="14" />
      `;
    case "ponytail":
      return `
        <ellipse cx="${cx}" cy="${headTop - 4}" rx="42" ry="20" />
        <path d="M ${cx + 36} ${headTop + 20} Q ${cx + 60} ${headTop + 80} ${cx + 42} ${headTop + 140}" stroke-width="18" stroke-linecap="round" fill="none" />
      `;
    case "short_straight":
      return `<path d="M ${cx - 48} ${headTop + 28} Q ${cx - 50} ${headTop - 10} ${cx} ${headTop - 16} Q ${cx + 50} ${headTop - 10} ${cx + 48} ${headTop + 28} Q ${cx + 20} ${headTop + 10} ${cx - 20} ${headTop + 10} Z" />`;
    case "pixie":
      return `<path d="M ${cx - 44} ${headTop + 20} Q ${cx - 46} ${headTop - 12} ${cx} ${headTop - 18} Q ${cx + 46} ${headTop - 12} ${cx + 44} ${headTop + 20} Z" />`;
    case "long_straight":
      return `
        <path d="M ${cx - 48} ${headTop + 20} Q ${cx - 52} ${headTop - 10} ${cx} ${headTop - 16} Q ${cx + 52} ${headTop - 10} ${cx + 48} ${headTop + 20} Q ${cx + 20} ${headTop + 8} ${cx - 20} ${headTop + 8} Z" />
        <path d="M ${cx - 52} ${headTop + 20} Q ${cx - 60} ${headCy + 80} ${cx - 56} ${headCy + 160}" stroke-width="22" stroke-linecap="round" fill="none" />
        <path d="M ${cx + 52} ${headTop + 20} Q ${cx + 60} ${headCy + 80} ${cx + 56} ${headCy + 160}" stroke-width="22" stroke-linecap="round" fill="none" />
      `;
    case "curly_medium":
      return `
        <path d="M ${cx - 44} ${headTop + 25} Q ${cx - 50} ${headTop - 12} ${cx} ${headTop - 18} Q ${cx + 50} ${headTop - 12} ${cx + 44} ${headTop + 25} Z" />
        <ellipse cx="${cx - 52}" cy="${headTop + 50}" rx="16" ry="20" />
        <ellipse cx="${cx + 52}" cy="${headTop + 50}" rx="16" ry="20" />
        <ellipse cx="${cx - 48}" cy="${headTop + 90}" rx="14" ry="18" />
        <ellipse cx="${cx + 48}" cy="${headTop + 90}" rx="14" ry="18" />
      `;
    case "braids":
      return `
        <path d="M ${cx - 44} ${headTop + 20} Q ${cx - 48} ${headTop - 10} ${cx} ${headTop - 16} Q ${cx + 48} ${headTop - 10} ${cx + 44} ${headTop + 20} Z" />
        <path d="M ${cx - 20} ${headTop + 20} Q ${cx - 30} ${headTop + 100} ${cx - 26} ${headTop + 180}" stroke-width="14" stroke-linecap="round" fill="none" />
        <path d="M ${cx + 20} ${headTop + 20} Q ${cx + 30} ${headTop + 100} ${cx + 26} ${headTop + 180}" stroke-width="14" stroke-linecap="round" fill="none" />
      `;
    case "long_wavy":
    default:
      return `
        <path d="M ${cx - 46} ${headTop + 22} Q ${cx - 52} ${headTop - 10} ${cx} ${headTop - 18} Q ${cx + 52} ${headTop - 10} ${cx + 46} ${headTop + 22} Q ${cx + 22} ${headTop + 10} ${cx - 22} ${headTop + 10} Z" />
        <path d="M ${cx - 54} ${headTop + 22} C ${cx - 72} ${headCy + 40} ${cx - 48} ${headCy + 80} ${cx - 62} ${headCy + 140} C ${cx - 70} ${headCy + 180} ${cx - 52} ${headCy + 200} ${cx - 58} ${headCy + 230}" stroke-width="24" stroke-linecap="round" fill="none" />
        <path d="M ${cx + 54} ${headTop + 22} C ${cx + 72} ${headCy + 40} ${cx + 48} ${headCy + 80} ${cx + 62} ${headCy + 140} C ${cx + 70} ${headCy + 180} ${cx + 52} ${headCy + 200} ${cx + 58} ${headCy + 230}" stroke-width="24" stroke-linecap="round" fill="none" />
      `;
  }
}

function buildArmsPaths(pose: PoseId, shape: ArchetypeShape, evolution: number): string {
  const cx = 200;
  const postureShift = evolutionPostureLift(evolution);
  const yShoulder = Y.shoulder + postureShift;
  const yWaist    = Y.waist    + postureShift;
  const sh = shape.shoulderHalf;

  switch (pose) {
    case "hands_on_hips":
      // Arms bent, hands on hips
      return `
        <path d="M ${cx - sh} ${yShoulder + 10} C ${cx - sh - 30} ${yShoulder + 40} ${cx - sh - 44} ${yShoulder + 90} ${cx - sh - 16} ${yWaist - 20}" stroke-width="20" stroke-linecap="round" fill="none" />
        <path d="M ${cx + sh} ${yShoulder + 10} C ${cx + sh + 30} ${yShoulder + 40} ${cx + sh + 44} ${yShoulder + 90} ${cx + sh + 16} ${yWaist - 20}" stroke-width="20" stroke-linecap="round" fill="none" />
      `;
    case "arms_crossed":
      return `
        <path d="M ${cx - sh} ${yShoulder + 10} C ${cx - sh - 20} ${yShoulder + 50} ${cx - 10} ${yShoulder + 80} ${cx + 30} ${yShoulder + 90}" stroke-width="20" stroke-linecap="round" fill="none" />
        <path d="M ${cx + sh} ${yShoulder + 10} C ${cx + sh + 20} ${yShoulder + 50} ${cx + 10} ${yShoulder + 80} ${cx - 30} ${yShoulder + 90}" stroke-width="20" stroke-linecap="round" fill="none" />
      `;
    case "striding":
    case "running":
      return `
        <path d="M ${cx - sh} ${yShoulder + 10} C ${cx - sh - 24} ${yShoulder + 60} ${cx - sh - 20} ${yShoulder + 110} ${cx - sh + 10} ${yShoulder + 150}" stroke-width="20" stroke-linecap="round" fill="none" />
        <path d="M ${cx + sh} ${yShoulder + 10} C ${cx + sh + 10} ${yShoulder + 40} ${cx + sh - 10} ${yShoulder + 80} ${cx + sh - 28} ${yShoulder + 100}" stroke-width="20" stroke-linecap="round" fill="none" />
      `;
    case "seated":
      return `
        <path d="M ${cx - sh} ${yShoulder + 10} L ${cx - sh - 10} ${yWaist + 10} L ${cx - sh + 30} ${yWaist + 10}" stroke-width="18" stroke-linecap="round" fill="none" />
        <path d="M ${cx + sh} ${yShoulder + 10} L ${cx + sh + 10} ${yWaist + 10} L ${cx + sh - 30} ${yWaist + 10}" stroke-width="18" stroke-linecap="round" fill="none" />
      `;
    case "pilates":
      return `
        <path d="M ${cx - sh} ${yShoulder + 10} C ${cx - sh - 10} ${yShoulder + 50} ${cx - sh + 10} ${yShoulder + 90} ${cx - sh + 30} ${yShoulder + 100}" stroke-width="20" stroke-linecap="round" fill="none" />
        <path d="M ${cx + sh} ${yShoulder + 10} C ${cx + sh + 10} ${yShoulder + 50} ${cx + sh - 10} ${yShoulder + 90} ${cx + sh - 30} ${yShoulder + 100}" stroke-width="20" stroke-linecap="round" fill="none" />
      `;
    case "standing":
    default:
      return `
        <path d="M ${cx - sh} ${yShoulder + 10} C ${cx - sh - 12} ${yShoulder + 70} ${cx - sh - 8} ${yShoulder + 130} ${cx - sh} ${yWaist - 10}" stroke-width="20" stroke-linecap="round" fill="none" />
        <path d="M ${cx + sh} ${yShoulder + 10} C ${cx + sh + 12} ${yShoulder + 70} ${cx + sh + 8} ${yShoulder + 130} ${cx + sh} ${yWaist - 10}" stroke-width="20" stroke-linecap="round" fill="none" />
      `;
  }
}

// ── Glow filter ───────────────────────────────────────────────────────────────

function buildGlowFilter(glowIntensity: number, filterId: string): string {
  if (glowIntensity === 0) return "";
  const blur = 8 + glowIntensity * 6;
  const opacity = 0.12 + glowIntensity * 0.1;
  return `
    <filter id="${filterId}" x="-30%" y="-20%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="blur" />
      <feColorMatrix in="blur" type="matrix"
        values="1 0.5 0.8 0 0  0.5 0.2 0.5 0 0  0.2 0.1 0.8 0 0  0 0 0 ${opacity} 0"
        result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  `;
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function renderAvatarSvg(def: AvatarDefinition): string {
  const [bgFrom, bgTo] = BACKGROUND_GRADIENTS[def.background];
  const skinColor = SKIN_TONES[def.skinTone];
  const hairColor = HAIR_COLORS[def.hairColor];
  const shape = ARCHETYPES[def.archetype];

  const filterId = `glow-${def.glow}`;
  const bodyPath = buildBodyPath(shape, def.evolution);
  const headSvg  = buildHeadPath(def.evolution);
  const hairSvg  = buildHairPath(def.hairStyle, def.evolution);
  const armsSvg  = buildArmsPaths(def.pose, shape, def.evolution);
  const glowFilter = buildGlowFilter(def.glow, filterId);

  // Height scaling: short=0.92, medium=1.0, tall=1.06
  const heightScale = def.height === "short" ? 0.92 : def.height === "tall" ? 1.06 : 1.0;
  // Frame scaling (horizontal only): petite=0.90, medium=1.0, strong=1.08
  const frameScaleX = def.frame === "petite" ? 0.90 : def.frame === "strong" ? 1.08 : 1.0;

  const transformStr = `scale(${frameScaleX.toFixed(2)}, ${heightScale.toFixed(2)}) translate(${((1 - frameScaleX) * 200).toFixed(1)}, ${((1 - heightScale) * 350).toFixed(1)})`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 700" width="400" height="700">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bgFrom}" />
      <stop offset="100%" stop-color="${bgTo}" />
    </linearGradient>
    ${glowFilter}
  </defs>

  <!-- Background -->
  <rect width="400" height="700" fill="url(#bg)" />

  <!-- Subtle ground shadow -->
  <ellipse cx="200" cy="670" rx="90" ry="12" fill="rgba(0,0,0,0.25)" />

  <!-- Avatar group: scaled by height + frame -->
  <g transform="${transformStr}" filter="${def.glow > 0 ? `url(#${filterId})` : ""}">

    <!-- Body silhouette -->
    <g fill="${skinColor}">
      <path d="${bodyPath}" />
    </g>

    <!-- Arms -->
    <g stroke="${skinColor}" fill="none">
      ${armsSvg}
    </g>

    <!-- Head -->
    <g fill="${skinColor}">
      ${headSvg}
    </g>

    <!-- Hair -->
    <g fill="${hairColor}" stroke="${hairColor}" stroke-linejoin="round">
      ${hairSvg}
    </g>

  </g>
</svg>`;
}

export function renderAvatarDataUri(def: AvatarDefinition): string {
  const svg = renderAvatarSvg(def);
  const encoded = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

/** Client-side safe version — returns a data URI from a base64-encoded SVG. */
export function renderAvatarSvgString(def: AvatarDefinition): string {
  return renderAvatarSvg(def);
}
