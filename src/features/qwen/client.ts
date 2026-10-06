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

const inflight = new Map<string, Promise<string>>();

function audioKey(text: string, voiceId: string) {
  return `${voiceId}\0en-locked\0${text}`;
}

/** True when this line was already spoken in this browser session. */
export function qwenAudioReady(text: string, voiceId: string) {
  return readyUrls.has(audioKey(text, voiceId));
}

/** Scene ids whose voice is already saved on disk. */
export async function qwenCachedSceneIds(
  voiceId: string,
  lines: { id: string; text: string }[],
): Promise<string[]> {
  if (lines.length === 0) return [];
  let response: Response;
  try {
    response = await fetch("/api/qwen/cached", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ voiceId, lines }),
    });
  } catch {
    return [];
  }
  if (!response.ok) return [];
  const body = (await response.json()) as { ready?: unknown };
  if (!Array.isArray(body.ready)) return [];
  return body.ready.filter((id): id is string => typeof id === "string");
}

/** Object URL for a line. Repeat plays of the same text and voice reuse it. */
export async function qwenAudioUrl(text: string, voiceId: string, signal?: AbortSignal) {
  const key = audioKey(text, voiceId);
  const cached = readyUrls.get(key);
  if (cached) {
    if (signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
    return cached;
  }
  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchQwenSpeech(text, voiceId)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        readyUrls.set(key, url);
        inflight.delete(key);
        return url;
      })
      .catch((error: unknown) => {
        inflight.delete(key);
        throw error;
      });
    inflight.set(key, pending);
  }
  const url = await pending;
  if (signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
  return url;
}
