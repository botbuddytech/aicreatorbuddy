export const SYSTEM_FONT_STACK = "system-ui, sans-serif";

export const FONT_WEIGHTS = ["400", "600", "700"] as const;
export type VideoFontWeight = (typeof FONT_WEIGHTS)[number];

export type VideoFontId =
  | "inter"
  | "montserrat"
  | "poppins"
  | "oswald"
  | "roboto"
  | "nunito"
  | "playfair"
  | "anton"
  | "bangers"
  | "bebas";

export type VideoFont = {
  id: VideoFontId;
  label: string;
  family: string;
  weights: readonly VideoFontWeight[];
};

export const VIDEO_FONTS: readonly VideoFont[] = [
  { id: "inter", label: "Inter", family: "Inter", weights: ["400", "600", "700"] },
  { id: "montserrat", label: "Montserrat", family: "Montserrat", weights: ["400", "600", "700"] },
  { id: "poppins", label: "Poppins", family: "Poppins", weights: ["400", "600", "700"] },
  { id: "oswald", label: "Oswald", family: "Oswald", weights: ["400", "600", "700"] },
  { id: "roboto", label: "Roboto", family: "Roboto", weights: ["400", "600", "700"] },
  { id: "nunito", label: "Nunito", family: "Nunito", weights: ["400", "600", "700"] },
  { id: "playfair", label: "Playfair Display", family: "Playfair Display", weights: ["400", "700"] },
  { id: "anton", label: "Anton", family: "Anton", weights: ["400"] },
  { id: "bangers", label: "Bangers", family: "Bangers", weights: ["400"] },
  { id: "bebas", label: "Bebas Neue", family: "Bebas Neue", weights: ["400"] },
];

export const DEFAULT_OVERLAY_FONT_WEIGHT: VideoFontWeight = "600";
export const DEFAULT_CAPTION_FONT_WEIGHT: VideoFontWeight = "600";
export const DEFAULT_OVERLAY_FONT_SIZE = 48;
export const DEFAULT_CAPTION_FONT_SIZE = 36;
export const MIN_FONT_SIZE = 28;
export const MAX_FONT_SIZE = 96;

const FONT_IDS = new Set<string>(VIDEO_FONTS.map((font) => font.id));

export function videoFont(id: string | null | undefined): VideoFont | null {
  return VIDEO_FONTS.find((font) => font.id === id) ?? null;
}

export function isVideoFontId(value: unknown): value is VideoFontId {
  return typeof value === "string" && FONT_IDS.has(value);
}

export function normalizeVideoFontId(value: unknown): VideoFontId | null {
  return isVideoFontId(value) ? value : null;
}

export function weightsForFont(fontId: VideoFontId | null): readonly VideoFontWeight[] {
  return videoFont(fontId)?.weights ?? FONT_WEIGHTS;
}

export function normalizeVideoFontWeight(
  fontId: VideoFontId | null,
  value: unknown,
  fallback: VideoFontWeight,
): VideoFontWeight {
  const allowed = weightsForFont(fontId);
  if (typeof value === "string" && allowed.includes(value as VideoFontWeight)) {
    return value as VideoFontWeight;
  }
  if (allowed.includes(fallback)) return fallback;
  return allowed[0] ?? fallback;
}

export function clampFontSize(value: unknown, fallback: number): number {
  const size = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)));
}

export function fontFamilyFor(id: VideoFontId | null): string {
  return videoFont(id)?.family ?? SYSTEM_FONT_STACK;
}

/** Stylesheet for the editor chrome. The composition loads the same faces itself. */
export function googleFontsStylesheetHref(): string {
  const families = VIDEO_FONTS.map((font) => {
    const name = encodeURIComponent(font.family).replace(/%20/g, "+");
    if (font.weights.length === 1) return `family=${name}`;
    return `family=${name}:wght@${font.weights.join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}
