"use client";

import type { QwenVoice } from "@/features/qwen/contract";
import { QWEN_DOWN_MESSAGE } from "@/features/qwen/contract";

const readyUrls = new Map<string, string>();

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    /* not json */
  }
  return fallback;
}

export async function fetchQwenVoices(signal?: AbortSignal): Promise<QwenVoice[]> {
  const response = await fetch("/api/qwen/voices", {
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Could not load Qwen voices."));
  }
  const body = (await response.json()) as { voices?: unknown };
  if (!Array.isArray(body.voices)) throw new Error("Could not load Qwen voices.");
  return body.voices.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as { id?: unknown; name?: unknown };
    if (typeof source.id !== "string" || typeof source.name !== "string") return [];
    const name = source.name.trim();
    if (!source.id || !name) return [];
    return [{ id: source.id, name }];
  });
}

async function fetchQwenSpeech(text: string, voiceId: string, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch("/api/qwen/speak", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "audio/wav, application/json" },
      body: JSON.stringify({ text, voiceId }),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new Error(QWEN_DOWN_MESSAGE);
  }
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Could not speak this scene's script."));
  }
  return response.blob();
}

/** Object URL for a line. Repeat plays of the same text and voice reuse it. */
export async function qwenAudioUrl(text: string, voiceId: string, signal?: AbortSignal) {
  const key = `${voiceId}\0${text}`;
  const cached = readyUrls.get(key);
  if (cached) return cached;
  const blob = await fetchQwenSpeech(text, voiceId, signal);
  const url = URL.createObjectURL(blob);
  readyUrls.set(key, url);
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }
  return url;
}
