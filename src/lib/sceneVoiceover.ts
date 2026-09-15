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

/**
 * Plays a scene's ready audio file, or falls back to browser speech synthesis
 * for the written script. Returns a stop handle.
 */
export function startSceneVoiceover(
  scene: VoiceoverScene,
  options?: { onEnded?: () => void; onError?: (message: string) => void },
): ActiveVoice | null {
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
    void audio.play().catch(() => {
      options?.onError?.("Could not play the saved voiceover.");
      stop();
    });
    return { sceneId: scene.id, stop };
  }

  const text = spokenVoiceoverText(scene.finalScript);
  if (!text) return null;
  if (typeof window === "undefined" || !window.speechSynthesis) {
    options?.onError?.("This browser cannot speak the script preview.");
    return null;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = volume;
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

/**
 * Keeps narration locked to the active timeline scene while the cut is playing.
 * Stops on pause, scene change, or unmount.
 */
export function useSyncedSceneVoiceover(
  scene: VoiceoverScene | null,
  playing: boolean,
  enabled: boolean,
) {
  const activeRef = useRef<ActiveVoice | null>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  const sceneId = scene?.id ?? null;
  const scriptKey = scene
    ? `${scene.finalScript}\0${scene.voiceover.status}\0${scene.voiceover.audioUrl ?? ""}\0${scene.editing.volume}`
    : "";

  useEffect(() => {
    activeRef.current?.stop();
    activeRef.current = null;

    const current = sceneRef.current;
    if (!enabled || !playing || !current) return;

    const handle = startSceneVoiceover(current);
    if (!handle) return;
    activeRef.current = handle;

    return () => {
      handle.stop();
      if (activeRef.current === handle) activeRef.current = null;
    };
  }, [sceneId, scriptKey, playing, enabled]);

  useEffect(
    () => () => {
      activeRef.current?.stop();
      activeRef.current = null;
    },
    [],
  );
}
