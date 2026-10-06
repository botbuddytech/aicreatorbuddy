"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { spokenVoiceoverText, startSceneVoiceover } from "@/lib/sceneVoiceover";
import type { Scene } from "@/lib/videoProject";

export { spokenVoiceoverText };

export function useVoiceoverPreview(onMeasured?: (sceneId: string, seconds: number) => void) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [lastMeasured, setLastMeasured] = useState<{ sceneId: string; seconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playingIdRef = useRef<string | null>(null);
  const loadingIdRef = useRef<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    playingIdRef.current = null;
    loadingIdRef.current = null;
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (!loadingId) return;
    const timer = window.setInterval(() => {
      setLoadingSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loadingId]);

  const preview = useCallback(
    (scene: Pick<Scene, "id" | "finalScript" | "voiceover" | "editing">, voiceId?: string | null) => {
      setError(null);
      if (playingIdRef.current === scene.id || loadingIdRef.current === scene.id) {
        stop();
        return;
      }
      stop();

      const text = spokenVoiceoverText(scene.finalScript);
      if (!text) {
        setError("Add a script before previewing the voiceover.");
        return;
      }

      loadingIdRef.current = scene.id;
      setLoadingId(scene.id);
      setLoadingSeconds(0);

      const handle = startSceneVoiceover(scene, {
        browserVoice: true,
        voiceId,
        onDuration: (seconds) => {
          setDurations((current) => ({ ...current, [scene.id]: seconds }));
          setLastMeasured({ sceneId: scene.id, seconds });
          onMeasured?.(scene.id, seconds);
        },
        onPlaying: () => {
          if (loadingIdRef.current !== scene.id) return;
          loadingIdRef.current = null;
          setLoadingId(null);
          playingIdRef.current = scene.id;
          setPlayingId(scene.id);
        },
        onEnded: () => {
          if (playingIdRef.current === scene.id) stop();
        },
        onError: (message) => {
          setError(message);
          stop();
        },
      });

      if (!handle) {
        loadingIdRef.current = null;
        setLoadingId(null);
        return;
      }
      stopRef.current = handle.stop;
    },
    [stop, onMeasured],
  );

  return { playingId, loadingId, loadingSeconds, durations, lastMeasured, error, preview, stop };
}
