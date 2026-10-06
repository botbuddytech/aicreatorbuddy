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

export type VisualPromptScene = {
  id: string;
  section: string;
  script: string;
  durationSeconds: number;
  order: number;
  existingPrompt: string | null;
};

export type CursorVisualPromptRequest = {
  topic: string;
  title: string;
  aspectRatio: "16:9" | "9:16";
  /** Scenes that need a new prompt, in film order. */
  scenes: VisualPromptScene[];
  /** Every spoken scene in the video, so each new prompt can continue the previous frame. */
  sequence: VisualPromptScene[];
};

export type CursorVisualPromptResponse = {
  prompts: Array<{ id: string; prompt: string }>;
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
  return { topic, title, aspectRatio, scenes, sequence };
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

/** Keeps one prompt per requested scene and states that scene's clip length and frame. */
export function normalizeVisualPrompts(
  value: unknown,
  scenes: readonly VisualPromptScene[],
  aspectRatio: "16:9" | "9:16",
): Array<{ id: string; prompt: string }> | null {
  if (!isRecord(value) || !Array.isArray(value.prompts)) return null;
  const expected = new Map(scenes.map((scene) => [scene.id, scene]));
  const found = new Map<string, string>();
  for (const candidate of value.prompts) {
    if (!isRecord(candidate) || found.size > expected.size) continue;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const scene = expected.get(id);
    if (!scene || found.has(id) || typeof candidate.prompt !== "string") continue;
    const prompt = candidate.prompt.replace(/\s+/g, " ").trim();
    if (!prompt || prompt.length > VISUAL_PROMPT_LIMITS.prompt) continue;
    const withDuration = mentionsDuration(prompt, scene.durationSeconds)
      ? prompt
      : `${prompt} Create a clip of exactly ${scene.durationSeconds} seconds.`;
    const withFrame = mentionsAspectRatio(withDuration, aspectRatio)
      ? withDuration
      : `${withDuration} Aspect ratio ${aspectRatio}.`;
    if (withFrame.length > VISUAL_PROMPT_LIMITS.prompt) continue;
    found.set(id, withFrame);
  }
  if (found.size !== scenes.length) return null;
  return scenes.map((scene) => ({ id: scene.id, prompt: found.get(scene.id) ?? "" }));
}
