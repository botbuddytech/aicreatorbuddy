"use client";

import { qwenAudioUrl } from "@/features/qwen/client";
import { MAX_PREVIEW_CHARS } from "@/features/elevenlabs/contract";
import { measureAudioSeconds, spokenVoiceoverText } from "@/lib/sceneVoiceover";
import { sceneRuntimeSeconds, type VideoProject } from "@/lib/videoProject";

export type ExportVoiceProvider = "qwen" | "elevenlabs";

export type SceneVoiceovers = {
  bySceneId: Record<string, string>;
  /** Spoken length of each scene. The cut uses this instead of the script length. */
  seconds: Record<string, number>;
  /** Releases ElevenLabs object URLs. Qwen URLs stay cached for Listen. */
  revoke: () => void;
};

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }
}

async function elevenLabsAudioUrl(
  voiceId: string,
  text: string,
  durationSeconds: number,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch("/api/elevenlabs/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      voiceId,
      text,
      durationSeconds: Math.max(1, Math.round(durationSeconds)),
    }),
    signal,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
    const message =
      typeof body?.error === "string" ? body.error : "ElevenLabs could not speak this scene.";
    throw new Error(message);
  }
  const blob = await response.blob();
  if (blob.size === 0) throw new Error("ElevenLabs returned no audio.");
  return URL.createObjectURL(blob);
}

/** Speaks every scene that has a script, in order, with the selected voice. */
export async function buildSceneVoiceovers(
  project: VideoProject,
  provider: ExportVoiceProvider,
  options?: {
    signal?: AbortSignal;
    onScene?: (done: number, total: number, label: string) => void;
  },
): Promise<SceneVoiceovers> {
  const spoken = project.scenes.flatMap((scene) => {
    const text = spokenVoiceoverText(scene.finalScript);
    return text ? [{ scene, text }] : [];
  });
  if (spoken.length === 0) {
    throw new Error("Add a spoken script to at least one scene before exporting with a voice.");
  }

  if (provider === "elevenlabs" && !project.elevenLabsVoice?.voiceId) {
    throw new Error("Choose an ElevenLabs voice on the timeline before exporting with ElevenLabs.");
  }

  const owned: string[] = [];
  const bySceneId: Record<string, string> = {};
  const seconds: Record<string, number> = {};
  try {
    for (const [index, item] of spoken.entries()) {
      throwIfAborted(options?.signal);
      const label = item.scene.sectionLabel.trim() || `Scene ${index + 1}`;
      options?.onScene?.(index + 1, spoken.length, label);
      if (provider === "elevenlabs" && item.text.length > MAX_PREVIEW_CHARS) {
        throw new Error(`“${label}” is too long for ElevenLabs. Shorten that scene and try again.`);
      }
      const url =
        provider === "qwen"
          ? await qwenAudioUrl(item.text, project.qwenVoice.voiceId, options?.signal)
          : await elevenLabsAudioUrl(
              project.elevenLabsVoice?.voiceId ?? "",
              item.text,
              sceneRuntimeSeconds(item.scene),
              options?.signal,
            );
      const length = await measureAudioSeconds(url);
      if (!length) throw new Error(`Could not read the voice length for “${label}”.`);
      if (provider === "elevenlabs") owned.push(url);
      bySceneId[item.scene.id] = url;
      seconds[item.scene.id] = length;
    }
  } catch (error) {
    for (const url of owned) URL.revokeObjectURL(url);
    throw error;
  }

  return {
    bySceneId,
    seconds,
    revoke: () => {
      for (const url of owned) URL.revokeObjectURL(url);
      owned.length = 0;
    },
  };
}
