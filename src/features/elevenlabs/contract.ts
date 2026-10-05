export const MAX_PREVIEW_CHARS = 5_000;

const VOICE_ID = /^[A-Za-z0-9_-]{8,64}$/;

export type ElevenLabsVoiceListItem = {
  voiceId: string;
  name: string;
  category: string | null;
};

export type ElevenLabsPreviewRequest = {
  voiceId: string;
  text: string;
  durationSeconds: number | null;
};

export function parsePreviewRequest(body: unknown): ElevenLabsPreviewRequest | null {
  if (!body || typeof body !== "object") return null;
  const source = body as { voiceId?: unknown; text?: unknown; durationSeconds?: unknown };
  if (typeof source.voiceId !== "string" || !VOICE_ID.test(source.voiceId)) return null;
  if (typeof source.text !== "string") return null;
  const text = source.text.replace(/\s+/g, " ").trim();
  if (!text || text.length > MAX_PREVIEW_CHARS) return null;
  const durationSeconds = source.durationSeconds;
  if (
    durationSeconds != null &&
    (typeof durationSeconds !== "number" ||
      !Number.isInteger(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > 4 * 60 * 60)
  ) {
    return null;
  }
  return {
    voiceId: source.voiceId,
    text,
    durationSeconds: typeof durationSeconds === "number" ? durationSeconds : null,
  };
}
