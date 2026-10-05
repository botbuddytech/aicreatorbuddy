export const THUMBNAIL_PROMPT_LIMITS = {
  title: 200,
  contextField: 100,
  prompt: 500,
  minPrompts: 1,
  maxPrompts: 8,
} as const;

export type CursorThumbnailPromptRequest = {
  title: string;
  format: string;
  intent: string;
};

export type CursorThumbnailPromptResponse = {
  prompts: string[];
  promptUsed: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

export function parseCursorThumbnailPromptRequest(
  value: unknown,
): CursorThumbnailPromptRequest | null {
  if (!isRecord(value)) return null;
  const title = boundedText(value.title, THUMBNAIL_PROMPT_LIMITS.title);
  const format = boundedText(value.format, THUMBNAIL_PROMPT_LIMITS.contextField);
  const intent = boundedText(value.intent, THUMBNAIL_PROMPT_LIMITS.contextField);
  if (!title || !format || !intent) return null;
  return { title, format, intent };
}

export function normalizeThumbnailPrompts(value: unknown): string[] | null {
  if (!isRecord(value) || !Array.isArray(value.prompts)) return null;

  const unique = new Map<string, string>();
  for (const candidate of value.prompts) {
    if (typeof candidate !== "string") continue;
    const prompt = candidate.replace(/\s+/g, " ").trim();
    if (!prompt || prompt.length > THUMBNAIL_PROMPT_LIMITS.prompt) continue;
    const key = prompt.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, prompt);
  }

  const prompts = [...unique.values()].slice(0, THUMBNAIL_PROMPT_LIMITS.maxPrompts);
  return prompts.length >= THUMBNAIL_PROMPT_LIMITS.minPrompts ? prompts : null;
}
