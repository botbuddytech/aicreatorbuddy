export const MAX_SPEAK_CHARS = 8_000;
export const DEFAULT_VOICE_ID = "Ryan";
export const QWEN_DOWN_MESSAGE =
  "Qwen isn't running yet. Wait for the voice server to finish loading, then try Listen again.";

const SPEAKER_ID = /^[A-Za-z][A-Za-z0-9_]{0,40}$/;

export type QwenVoice = {
  id: string;
  name: string;
};

export type QwenSpeakRequest = {
  text: string;
  voiceId: string;
};

export const QWEN_SPEAKERS: QwenVoice[] = [
  { id: "Ryan", name: "Ryan (English)" },
  { id: "Aiden", name: "Aiden (English)" },
  { id: "Vivian", name: "Vivian (Chinese)" },
  { id: "Serena", name: "Serena (Chinese)" },
  { id: "Uncle_Fu", name: "Uncle Fu (Chinese)" },
  { id: "Dylan", name: "Dylan (Chinese)" },
  { id: "Eric", name: "Eric (Chinese)" },
  { id: "Ono_Anna", name: "Ono Anna (Japanese)" },
  { id: "Sohee", name: "Sohee (Korean)" },
];

export function isQwenVoiceId(value: string): boolean {
  return SPEAKER_ID.test(value) && QWEN_SPEAKERS.some((voice) => voice.id === value);
}

export function qwenVoiceId(voiceover: {
  provider: string | null;
  voiceId: string | null;
}): string {
  if (voiceover.provider === "qwen" && voiceover.voiceId && isQwenVoiceId(voiceover.voiceId)) {
    return voiceover.voiceId;
  }
  return DEFAULT_VOICE_ID;
}

const SCENE_ID = /^[A-Za-z0-9_-]{1,80}$/;

export type QwenCachedLine = {
  id: string;
  text: string;
};

export function readCachedRequest(
  body: unknown,
): { voiceId: string; lines: QwenCachedLine[] } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request." };
  const source = body as { voiceId?: unknown; lines?: unknown };
  if (typeof source.voiceId !== "string" || !isQwenVoiceId(source.voiceId)) {
    return { error: "Choose a Qwen voice." };
  }
  if (!Array.isArray(source.lines) || source.lines.length > 40) return { error: "Invalid request." };
  const lines: QwenCachedLine[] = [];
  for (const item of source.lines) {
    if (!item || typeof item !== "object") return { error: "Invalid request." };
    const line = item as { id?: unknown; text?: unknown };
    if (typeof line.id !== "string" || !SCENE_ID.test(line.id)) return { error: "Invalid request." };
    if (typeof line.text !== "string") return { error: "Invalid request." };
    const text = line.text.replace(/\s+/g, " ").trim();
    if (!text || text.length > MAX_SPEAK_CHARS) continue;
    lines.push({ id: line.id, text });
  }
  return { voiceId: source.voiceId, lines };
}

export function readSpeakRequest(body: unknown): QwenSpeakRequest | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request." };
  const source = body as { text?: unknown; voiceId?: unknown };
  if (typeof source.text !== "string" || typeof source.voiceId !== "string") {
    return { error: "Add a script and choose a Qwen voice." };
  }
  const text = source.text.replace(/\s+/g, " ").trim();
  if (!text) return { error: "Add a script before previewing the voiceover." };
  if (text.length > MAX_SPEAK_CHARS) return { error: "This scene is too long to speak in one pass." };
  if (!isQwenVoiceId(source.voiceId)) return { error: "Choose a Qwen voice." };
  return { text, voiceId: source.voiceId };
}

export function parseVoiceList(body: unknown): QwenVoice[] | null {
  if (!body || typeof body !== "object") return null;
  const voices = (body as { voices?: unknown }).voices;
  if (!Array.isArray(voices)) return null;
  const parsed: QwenVoice[] = [];
  for (const item of voices) {
    if (!item || typeof item !== "object") return null;
    const source = item as { id?: unknown; name?: unknown };
    if (typeof source.id !== "string" || !isQwenVoiceId(source.id)) return null;
    if (typeof source.name !== "string") return null;
    const name = source.name.trim();
    if (!name || name.length > 120) return null;
    parsed.push({ id: source.id, name });
  }
  if (!parsed.some((voice) => voice.id === DEFAULT_VOICE_ID)) {
    parsed.unshift({ id: DEFAULT_VOICE_ID, name: "Ryan (English)" });
  }
  return parsed;
}
