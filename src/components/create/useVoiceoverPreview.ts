"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  spokenVoiceoverText,
  startSceneVoiceover,
} from "@/lib/sceneVoiceover";
import type { Scene } from "@/lib/videoProject";

export { spokenVoiceoverText };

export function useVoiceoverPreview() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playingIdRef = useRef<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    playingIdRef.current = null;
    setPlayingId(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const preview = useCallback(
    (scene: Pick<Scene, "id" | "finalScript" | "voiceover" | "editing">) => {
      setError(null);
      if (playingIdRef.current === scene.id) {
        stop();
        return;
      }
      stop();

      const text = spokenVoiceoverText(scene.finalScript);
      const hasFile =
        scene.voiceover.status === "ready" && Boolean(scene.voiceover.audioUrl);
      if (!hasFile && !text) {
        setError("Add a script before previewing the voiceover.");
        return;
      }

      playingIdRef.current = scene.id;
      setPlayingId(scene.id);

      const handle = startSceneVoiceover(scene, {
        onEnded: () => {
          if (playingIdRef.current === scene.id) stop();
        },
        onError: (message) => {
          setError(message);
          stop();
        },
      });

      if (!handle) {
        setPlayingId(null);
        playingIdRef.current = null;
        return;
      }
      stopRef.current = handle.stop;
    },
    [stop],
  );

  return { playingId, error, preview, stop };
}
