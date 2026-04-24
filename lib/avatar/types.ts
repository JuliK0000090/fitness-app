export type Archetype = "hourglass" | "pear" | "rectangle" | "inverted_triangle" | "apple";
export type Height = "short" | "medium" | "tall";
export type Frame = "petite" | "medium" | "strong";
export type SkinTone = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type HairStyle =
  | "short_straight" | "long_wavy" | "ponytail" | "bun"
  | "curly_medium" | "pixie" | "braids" | "long_straight";
export type HairColor = "black" | "brown" | "blonde" | "red" | "grey";
export type OutfitId =
  | "activewear_set" | "sports_bra_leggings" | "biker_shorts_crop"
  | "loungewear" | "little_black_dress" | "swimsuit"
  | "blazer_pants" | "wrap_dress";
export type PoseId =
  | "standing" | "hands_on_hips" | "arms_crossed"
  | "striding" | "pilates" | "running" | "seated";
export type BackgroundId = "studio" | "beach" | "city" | "gym" | "event";

export interface AvatarDefinition {
  archetype: Archetype;
  height: Height;
  frame: Frame;
  skinTone: SkinTone;
  hairStyle: HairStyle;
  hairColor: HairColor;
  outfit: OutfitId;
  pose: PoseId;
  background: BackgroundId;
  accessories: string[];
  /** 0 = today, 4 = fully at goal. Shifts posture, glow, stance. */
  evolution: 0 | 1 | 2 | 3 | 4;
  /** 0–3 confidence/energy glow intensity */
  glow: 0 | 1 | 2 | 3;
}

export const DEFAULT_AVATAR_DEFINITION: AvatarDefinition = {
  archetype: "rectangle",
  height: "medium",
  frame: "medium",
  skinTone: 3,
  hairStyle: "long_wavy",
  hairColor: "brown",
  outfit: "activewear_set",
  pose: "hands_on_hips",
  background: "studio",
  accessories: [],
  evolution: 0,
  glow: 1,
};

// Skin tone palette (Fenty-style 7-tone scale)
export const SKIN_TONES: Record<SkinTone, string> = {
  1: "#FDDBB4",
  2: "#EAB98A",
  3: "#C68642",
  4: "#A0522D",
  5: "#7B3F00",
  6: "#4A2912",
  7: "#2C1503",
};

export const HAIR_COLORS: Record<HairColor, string> = {
  black: "#1A1A1A",
  brown: "#5C3317",
  blonde: "#C9A84C",
  red: "#8B2500",
  grey: "#A0A0A0",
};

export const BACKGROUND_GRADIENTS: Record<BackgroundId, [string, string]> = {
  studio: ["#1A1A2E", "#16213E"],
  beach: ["#0F3460", "#533483"],
  city: ["#1A1A2E", "#2D2D44"],
  gym: ["#0D0D0D", "#1A1A1A"],
  event: ["#1A0A2E", "#2D1050"],
};
