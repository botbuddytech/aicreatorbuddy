"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { qwenAudioUrl } from "@/features/qwen/client";
import { DEFAULT_VOICE_ID, isQwenVoiceId } from "@/features/qwen/contract";
import type { Scene } from "@/lib/videoProject";

export function measureAudioSeconds(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    const finish = (seconds: number | null) => {
      audio.removeAttribute("src");
      audio.load();
      resolve(seconds);
    };
    audio.onloadedmetadata = () => {
      finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    };
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}

export function spokenVoiceoverText(script: string) {
  return script
    .replace(/\s*(?:→|->)\s*/g, ". ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type VoiceoverScene = Pick<Scene, "id" | "finalScript" | "voiceover" | "editing">;

type ActiveVoice = {
  sceneId: string;
  stop: () => void;
};

type VoiceoverOptions = {
  offsetSeconds?: number;
  /** Speak with Qwen. Do not play a saved or ElevenLabs file. */
  browserVoice?: boolean;
  /** Demo voice for every scene. Falls back to Ryan. */
  voiceId?: string | null;
  onPlaying?: () => void;
  onDuration?: (seconds: number) => void;
  onEnded?: () => void;
  onError?: (message: string) => void;
};

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function playAudio(
  url: string,
  volume: number,
  offset: number,
  options: VoiceoverOptions | undefined,
  isStopped: () => boolean,
  fail: (message: string) => void,
) {
  const audio = new Audio(url);
  audio.volume = volume;
  audio.onended = () => {
    if (!isStopped()) options?.onEnded?.();
  };
  audio.onerror = () => {
    if (isStopped()) return;
    fail("Could not play the voiceover.");
  };
  const reportDuration = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    options?.onDuration?.(audio.duration);
  };
  audio.addEventListener("loadedmetadata", reportDuration);
  const begin = () => {
    if (isStopped()) return;
    if (offset > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = Math.min(offset, Math.max(0, audio.duration - 0.05));
    }
    void audio
      .play()
      .then(() => {
        reportDuration();
        if (!isStopped()) options?.onPlaying?.();
      })
      .catch(() => {
        if (isStopped()) return;
        fail("Could not play the voiceover.");
      });
  };
  if (offset > 0) {
    audio.addEventListener("loadedmetadata", begin, { once: true });
    audio.load();
  } else {
    begin();
  }
  return audio;
}

/**
 * Plays a scene's ready audio file, or speaks the script with Qwen.
 * `offsetSeconds` keeps narration aligned with the playhead when the beat is
 * joined mid-way. Qwen audio seeks with currentTime; the file is the
 * full line so a repeated listen can reuse it.
 */
export function startSceneVoiceover(
  scene: VoiceoverScene,
  options?: VoiceoverOptions,
): ActiveVoice | null {
  const offset = Math.max(0, options?.offsetSeconds ?? 0);
  const audioUrl =
    options?.browserVoice || scene.voiceover.status !== "ready"
      ? null
      : scene.voiceover.audioUrl;
  const volume = Math.max(0, Math.min(1, (scene.editing?.volume ?? 100) / 100));

  if (audioUrl) {
    let stopped = false;
    let audio: HTMLAudioElement | null = null;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      audio?.pause();
      audio?.removeAttribute("src");
    };
    audio = playAudio(audioUrl, volume, offset, options, () => stopped, (message) => {
      options?.onError?.(message === "Could not play the voiceover." ? "Could not play the saved voiceover." : message);
      stop();
    });
    return { sceneId: scene.id, stop };
  }

  const text = spokenVoiceoverText(scene.finalScript);
  if (!text) return null;

  const controller = new AbortController();
  let audio: HTMLAudioElement | null = null;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    controller.abort();
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
  };

  void (async () => {
    try {
      const url = await qwenAudioUrl(
        text,
        options?.voiceId && isQwenVoiceId(options.voiceId) ? options.voiceId : DEFAULT_VOICE_ID,
        controller.signal,
      );
      if (stopped) return;
      audio = playAudio(url, volume, offset, options, () => stopped, (message) => {
        options?.onError?.(
          message === "Could not play the voiceover." ? "Could not play the Qwen voice." : message,
        );
        stop();
      });
    } catch (error) {
      if (stopped || isAbortError(error)) return;
      options?.onError?.(
        error instanceof Error && error.message
          ? error.message
          : "Could not speak this scene's script.",
      );
    }
  })();

  return { sceneId: scene.id, stop };
}

type SyncOptions = {
  scene: VoiceoverScene | null;
  playing: boolean;
  enabled: boolean;
  /** Seconds into the active beat (playhead − beat start). */
  sceneLocalSeconds?: number;
  /**
   * Bump on seek / play / restart so narration re-locks to the playhead
   * even when the scene id did not change.
   */
  syncKey?: number;
  /** Preview uses the Listen voice, not a generated audio file. */
  browserVoice?: boolean;
  /** Demo voice shared by every scene. */
  voiceId?: string | null;
  onError?: (message: string) => void;
};

/**
 * Keeps narration locked to the active timeline scene while the cut is playing.
 * Stops on pause, scene change, seek realign, or unmount.
 */
export function useSyncedSceneVoiceover({
  scene,
  playing,
  enabled,
  sceneLocalSeconds = 0,
  syncKey = 0,
  browserVoice = false,
  voiceId = null,
  onError,
}: SyncOptions) {
  const activeRef = useRef<ActiveVoice | null>(null);
  const sceneRef = useRef(scene);
  const offsetRef = useRef(sceneLocalSeconds);
  const onErrorRef = useRef(onError);

  useLayoutEffect(() => {
    sceneRef.current = scene;
    offsetRef.current = sceneLocalSeconds;
    onErrorRef.current = onError;
  });

  const sceneId = scene?.id ?? null;
  const scriptKey = scene
    ? `${scene.finalScript}\0${scene.voiceover.status}\0${scene.voiceover.audioUrl ?? ""}\0${scene.voiceover.provider ?? ""}\0${scene.voiceover.voiceId ?? ""}\0${scene.editing.volume}`
    : "";

  useEffect(() => {
    activeRef.current?.stop();
    activeRef.current = null;

    const current = sceneRef.current;
    if (!enabled || !playing || !current) return;

    const handle = startSceneVoiceover(current, {
      offsetSeconds: offsetRef.current,
      browserVoice,
      voiceId,
      onError: (message) => onErrorRef.current?.(message),
    });
    if (!handle) return;
    activeRef.current = handle;

    return () => {
      handle.stop();
      if (activeRef.current === handle) activeRef.current = null;
    };
    // offset is sampled when syncKey / scene / play state changes — not every frame.
  }, [sceneId, scriptKey, playing, enabled, syncKey, browserVoice, voiceId]);

  useEffect(
    () => () => {
      activeRef.current?.stop();
      activeRef.current = null;
    },
    [],
  );
}
