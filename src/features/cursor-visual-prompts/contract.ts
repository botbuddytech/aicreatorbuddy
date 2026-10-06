import {
  normalizeVisualStyle,
  normalizeVisualStylePrompt,
  VISUAL_GLOBAL_BLOCK,
  visualAvoidList,
  type VisualStyleId,
} from "@/lib/visualStyles";

export const VISUAL_PROMPT_LIMITS = {
  topic: 2_000,
  title: 500,
  section: 80,
  script: 8_000,
  prompt: 6_000,
  existingPrompt: 6_000,
  minDurationSeconds: 1,
  maxDurationSeconds: 4 * 60 * 60,
  minScenes: 1,
  maxScenes: 48,
} as const;

export type VisualClipSource = "direct" | "still";

export type VisualPromptScene = {
  id: string;
  section: string;
  script: string;
  durationSeconds: number;
  order: number;
  existingPrompt: string | null;
  /** Missing values are direct, so older requests keep one clip prompt. */
  clipSource: VisualClipSource;
};

export type CursorVisualPromptRequest = {
  topic: string;
  title: string;
  aspectRatio: "16:9" | "9:16";
  /** Scenes that need a new prompt, in film order. */
  scenes: VisualPromptScene[];
  /** Every spoken scene in the video, so each new prompt can continue the previous frame. */
  sequence: VisualPromptScene[];
  /** Selected look. Null keeps the faceless object film. */
  styleId: VisualStyleId | null;
  /**
   * This video's saved copy of the style prompt.
   * Null means use the shared library prompt for styleId.
   */
  stylePrompt: string | null;
};

export type CursorVisualPromptResponse = {
  prompts: Array<{ id: string; prompt: string; imagePrompt: string }>;
  promptUsed: string;
};

const SCENE_ID = /^[A-Za-z0-9_-]{1,80}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, max: number, allowEmpty = false): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length > max) return null;
  if (!text && !allowEmpty) return null;
  return text;
}

export function parseCursorVisualPromptRequest(value: unknown): CursorVisualPromptRequest | null {
  if (!isRecord(value) || !Array.isArray(value.scenes)) return null;
  if (
    value.scenes.length < VISUAL_PROMPT_LIMITS.minScenes ||
    value.scenes.length > VISUAL_PROMPT_LIMITS.maxScenes
  ) {
    return null;
  }
  const topic = boundedText(value.topic, VISUAL_PROMPT_LIMITS.topic, true);
  const title = boundedText(value.title, VISUAL_PROMPT_LIMITS.title, true);
  const aspectRatio = value.aspectRatio === "16:9" || value.aspectRatio === "9:16" ? value.aspectRatio : null;
  if (topic === null || title === null || !aspectRatio) return null;

  const scenes = parseSceneList(value.scenes);
  if (!scenes) return null;
  const sequence = Array.isArray(value.sequence) ? parseSceneList(value.sequence) : scenes;
  if (!sequence) return null;
  if (!scenes.every((scene) => sequence.some((item) => item.id === scene.id))) return null;
  const styleId = value.styleId == null || value.styleId === "" ? null : normalizeVisualStyle(value.styleId);
  if (value.styleId != null && value.styleId !== "" && !styleId) return null;
  const rawStylePrompt = typeof value.stylePrompt === "string" ? value.stylePrompt.trim() : "";
  const stylePrompt = rawStylePrompt ? normalizeVisualStylePrompt(rawStylePrompt) : null;
  if (rawStylePrompt && !stylePrompt) return null;
  if (stylePrompt && !styleId) return null;
  return { topic, title, aspectRatio, scenes, sequence, styleId, stylePrompt };
}

function parseSceneList(value: unknown): VisualPromptScene[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length < 1 || value.length > VISUAL_PROMPT_LIMITS.maxScenes) return null;
  const seen = new Set<string>();
  const scenes: VisualPromptScene[] = [];
  for (const [index, candidate] of value.entries()) {
    if (!isRecord(candidate)) return null;
    const id = boundedText(candidate.id, 80);
    const section = boundedText(candidate.section, VISUAL_PROMPT_LIMITS.section);
    const script = boundedText(candidate.script, VISUAL_PROMPT_LIMITS.script);
    const durationSeconds = candidate.durationSeconds;
    const order =
      typeof candidate.order === "number" && Number.isInteger(candidate.order) && candidate.order > 0
        ? candidate.order
        : index + 1;
    const existingRaw = candidate.existingPrompt;
    const existingPrompt =
      existingRaw == null ? null : boundedText(existingRaw, VISUAL_PROMPT_LIMITS.existingPrompt, true);
    if (existingRaw != null && existingPrompt === null) return null;
    const clipSource =
      candidate.clipSource == null || candidate.clipSource === ""
        ? "direct"
        : candidate.clipSource === "direct" || candidate.clipSource === "still"
          ? candidate.clipSource
          : null;
    if (!clipSource) return null;
    if (
      !id ||
      !SCENE_ID.test(id) ||
      seen.has(id) ||
      !section ||
      !script ||
      typeof durationSeconds !== "number" ||
      !Number.isInteger(durationSeconds) ||
      durationSeconds < VISUAL_PROMPT_LIMITS.minDurationSeconds ||
      durationSeconds > VISUAL_PROMPT_LIMITS.maxDurationSeconds
    ) {
      return null;
    }
    seen.add(id);
    scenes.push({
      id,
      section,
      script,
      durationSeconds,
      order,
      existingPrompt: existingPrompt || null,
      clipSource,
    });
  }
  return scenes;
}

function mentionsDuration(prompt: string, seconds: number): boolean {
  return new RegExp(`\\b${seconds}\\s*(?:s\\b|sec|second)`, "i").test(prompt);
}

function mentionsAspectRatio(prompt: string, aspectRatio: "16:9" | "9:16"): boolean {
  return prompt.includes(aspectRatio);
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Channel and studio names. Naming them in the picture prompt makes the model draw the word. */
const STYLE_NAME_PATTERNS = [
  /\bin the style of Studio Ghibli\b/gi,
  /\bStudio Ghibli\b/gi,
  /\bGhibli\b/gi,
  /\bin the style of Zack D Films\b/gi,
  /\bZack D Films\b/gi,
  /\bZack D\b/gi,
  /\bin the style of Pixar\b/gi,
  /\bPixar\b/gi,
  /\bin the style of Vox\b/gi,
  /\bVox\b/gi,
];

function withoutStyleNames(text: string, script: string): string {
  const spoken = script.toLowerCase();
  let next = text;
  for (const pattern of STYLE_NAME_PATTERNS) {
    next = next.replace(pattern, (match) => (spoken.includes(match.toLowerCase()) ? match : ""));
  }
  return next
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
}

/** Short spoken lines are the words the picture has to show, such as "Force majeure". */
export function shortSpokenLines(script: string): string[] {
  const clean = script.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  return clean
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => {
      const words = part.replace(/[.!?]+$/g, "").split(/\s+/).filter(Boolean);
      return words.length > 0 && words.length <= 4;
    });
}

function readableWordsBit(body: string, script: string): string {
  const missing = shortSpokenLines(script).filter((line) => {
    const bare = line.replace(/[.!?]+$/g, "").trim();
    return bare && !body.toLowerCase().includes(bare.toLowerCase());
  });
  if (missing.length === 0) return "";
  const quoted = missing.map((line) => `"${line.replace(/[.!?]+$/g, "").trim()}"`).join(", ");
  return ` Readable on-screen text, spelled exactly: ${quoted}.`;
}

function styleSentence(body: string, stylePrompt: string | null, script: string): string {
  const style = stylePrompt ? withoutStyleNames(oneLine(stylePrompt), script) : "";
  return style && !body.includes(style) ? ` Visual style: ${style}` : "";
}

function sharedSceneTail(body: string, styleId: VisualStyleId | null): string {
  const globalBit = body.includes(VISUAL_GLOBAL_BLOCK) ? "" : ` ${VISUAL_GLOBAL_BLOCK}`;
  const avoid = `avoid: ${visualAvoidList(styleId)}`;
  const avoidBit = body.toLowerCase().includes("avoid:") ? "" : ` ${avoid}.`;
  return `${globalBit}${avoidBit}`;
}

function fitPrompt(body: string, tail: string): string | null {
  const maxShot = VISUAL_PROMPT_LIMITS.prompt - tail.length;
  if (maxShot < 40) return null;
  const trimmed = body.length > maxShot ? body.slice(0, maxShot).trimEnd() : body;
  const combined = `${trimmed}${tail}`.trim();
  if (!combined || combined.length > VISUAL_PROMPT_LIMITS.prompt) return null;
  return combined;
}

/** Keeps duration, frame, and the selected style inside the prompt limit. */
export function composeVisualPrompt(
  shot: string,
  durationSeconds: number,
  aspectRatio: "16:9" | "9:16",
  stylePrompt: string | null,
  script = "",
  styleId: VisualStyleId | null = null,
): string | null {
  const body = withoutStyleNames(oneLine(shot), script);
  if (!body) return null;
  const durationBit = mentionsDuration(body, durationSeconds)
    ? ""
    : ` Create a clip of exactly ${durationSeconds} seconds.`;
  const aspectBit = mentionsAspectRatio(body, aspectRatio) ? "" : ` Aspect ratio ${aspectRatio}.`;
  const wordsBit = readableWordsBit(body, script);
  return fitPrompt(
    body,
    `${durationBit}${aspectBit}${wordsBit}${styleSentence(body, stylePrompt, script)}${sharedSceneTail(body, styleId)}`,
  );
}

/** Opening frame: aspect ratio and style, never a timed clip. */
function composeStillPrompt(
  shot: string,
  aspectRatio: "16:9" | "9:16",
  stylePrompt: string | null,
  script = "",
  styleId: VisualStyleId | null = null,
): string | null {
  const body = withoutStyleNames(oneLine(shot), script);
  if (!body) return null;
  const aspectBit = mentionsAspectRatio(body, aspectRatio) ? "" : ` Aspect ratio ${aspectRatio}.`;
  const wordsBit = readableWordsBit(body, script);
  return fitPrompt(
    body,
    `${aspectBit}${wordsBit}${styleSentence(body, stylePrompt, script)}${sharedSceneTail(body, styleId)}`,
  );
}

/** Keeps one clip prompt per scene. A still scene also keeps an opening-frame prompt. */
export function normalizeVisualPrompts(
  value: unknown,
  scenes: readonly VisualPromptScene[],
  aspectRatio: "16:9" | "9:16",
  stylePrompt: string | null = null,
  styleId: VisualStyleId | null = null,
): Array<{ id: string; prompt: string; imagePrompt: string }> | null {
  if (!isRecord(value) || !Array.isArray(value.prompts)) return null;
  const expected = new Map(scenes.map((scene) => [scene.id, scene]));
  const found = new Map<string, { prompt: string; imagePrompt: string }>();
  for (const candidate of value.prompts) {
    if (!isRecord(candidate) || found.size > expected.size) continue;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const scene = expected.get(id);
    if (!scene || found.has(id) || typeof candidate.prompt !== "string") continue;
    if (candidate.imagePrompt != null && typeof candidate.imagePrompt !== "string") return null;
    const imageText = typeof candidate.imagePrompt === "string" ? oneLine(candidate.imagePrompt) : "";
    const source = scene.clipSource === "still" ? "still" : "direct";
    if (source === "direct" && imageText) return null;
    const prompt = composeVisualPrompt(
      candidate.prompt,
      scene.durationSeconds,
      aspectRatio,
      stylePrompt,
      scene.script,
      styleId,
    );
    if (!prompt) continue;
    if (source === "direct") {
      found.set(id, { prompt, imagePrompt: "" });
      continue;
    }
    if (!imageText) continue;
    const imagePrompt = composeStillPrompt(imageText, aspectRatio, stylePrompt, scene.script, styleId);
    if (!imagePrompt) continue;
    found.set(id, { prompt, imagePrompt });
  }
  if (found.size !== scenes.length) return null;
  return scenes.map((scene) => {
    const item = found.get(scene.id);
    return { id: scene.id, prompt: item?.prompt ?? "", imagePrompt: item?.imagePrompt ?? "" };
  });
}
