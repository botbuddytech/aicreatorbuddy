"use client";

import { useEffect, useRef } from "react";
import type { Scene } from "@/lib/videoProject";

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

/** Rough spoken pace so a mid-scene seek can skip into the script. */
const CHARS_PER_SECOND = 14.5;

function textFromOffset(script: string, offsetSeconds: number): string {
  const full = spokenVoiceoverText(script);
  if (!full) return "";
  if (offsetSeconds <= 0.15) return full;
  const skip = Math.min(full.length, Math.floor(offsetSeconds * CHARS_PER_SECOND));
  if (skip <= 0) return full;
  const sliced = full.slice(skip);
  // Prefer starting on a word boundary so speech doesn't begin mid-word.
  const trimmed = sliced.replace(/^\S*\s+/, "").trim();
  return trimmed || sliced.trim();
}

/**
 * Plays a scene's ready audio file, or falls back to browser speech synthesis
 * for the written script. `offsetSeconds` keeps narration aligned with the
 * playhead when the beat is joined mid-way.
 */
export function startSceneVoiceover(
  scene: VoiceoverScene,
  options?: {
    offsetSeconds?: number;
    onEnded?: () => void;
    onError?: (message: string) => void;
  },
): ActiveVoice | null {
  const offset = Math.max(0, options?.offsetSeconds ?? 0);
  const audioUrl =
    scene.voiceover.status === "ready" ? scene.voiceover.audioUrl : null;
  const volume = Math.max(0, Math.min(1, (scene.editing?.volume ?? 100) / 100));

  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.volume = volume;
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      audio.pause();
      audio.removeAttribute("src");
    };
    audio.onended = () => {
      if (!stopped) options?.onEnded?.();
    };
    audio.onerror = () => {
      options?.onError?.("Could not play the saved voiceover.");
      stop();
    };
    const playFromOffset = () => {
      if (stopped) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.min(offset, Math.max(0, audio.duration - 0.05));
      }
      void audio.play().catch(() => {
        options?.onError?.("Could not play the saved voiceover.");
        stop();
      });
    };
    if (offset > 0) {
      audio.addEventListener("loadedmetadata", playFromOffset, { once: true });
      audio.load();
    } else {
      void audio.play().catch(() => {
        options?.onError?.("Could not play the saved voiceover.");
        stop();
      });
    }
    return { sceneId: scene.id, stop };
  }

  const text = textFromOffset(scene.finalScript, offset);
  if (!text) return null;
  if (typeof window === "undefined" || !window.speechSynthesis) {
    options?.onError?.("This browser cannot speak the script preview.");
    return null;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = volume;
  // Slightly brisk so short beats finish closer to the cut.
  utterance.rate = 1.05;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.speechSynthesis.cancel();
  };
  utterance.onend = () => {
    if (!stopped) options?.onEnded?.();
  };
  utterance.onerror = () => {
    if (!stopped) options?.onEnded?.();
  };
  // Slight delay so a prior cancel doesn't swallow this utterance.
  const timer = window.setTimeout(() => {
    if (!stopped) window.speechSynthesis.speak(utterance);
  }, 40);

  return {
    sceneId: scene.id,
    stop: () => {
      window.clearTimeout(timer);
      stop();
    },
  };
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
}: SyncOptions) {
  const activeRef = useRef<ActiveVoice | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const offsetRef = useRef(sceneLocalSeconds);
  offsetRef.current = sceneLocalSeconds;

  const sceneId = scene?.id ?? null;
  const scriptKey = scene
    ? `${scene.finalScript}\0${scene.voiceover.status}\0${scene.voiceover.audioUrl ?? ""}\0${scene.editing.volume}`
    : "";

  useEffect(() => {
    activeRef.current?.stop();
    activeRef.current = null;

    const current = sceneRef.current;
    if (!enabled || !playing || !current) return;

    const handle = startSceneVoiceover(current, {
      offsetSeconds: offsetRef.current,
    });
    if (!handle) return;
    activeRef.current = handle;

    return () => {
      handle.stop();
      if (activeRef.current === handle) activeRef.current = null;
    };
    // offset is sampled when syncKey / scene / play state changes — not every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, scriptKey, playing, enabled, syncKey]);

  useEffect(
    () => () => {
      activeRef.current?.stop();
      activeRef.current = null;
    },
    [],
  );
}
