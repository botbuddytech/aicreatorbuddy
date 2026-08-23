"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Scene } from "@/lib/videoProject";

export function spokenVoiceoverText(script: string) {
  return script
    .replace(/\s*(?:→|->)\s*/g, ". ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useVoiceoverPreview() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playingIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakTimerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (speakTimerRef.current != null) {
      window.clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audioRef.current = null;
    }
    playingIdRef.current = null;
    setPlayingId(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const preview = useCallback(
    (scene: Pick<Scene, "id" | "finalScript" | "voiceover">) => {
      setError(null);
      if (playingIdRef.current === scene.id) {
        stop();
        return;
      }
      stop();

      const audioUrl =
        scene.voiceover.status === "ready" ? scene.voiceover.audioUrl : null;
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          if (playingIdRef.current === scene.id) stop();
        };
        audio.onerror = () => {
          setError("Could not play the saved voiceover.");
          stop();
        };
        playingIdRef.current = scene.id;
        setPlayingId(scene.id);
        void audio.play().catch(() => {
          setError("Could not play the saved voiceover.");
          stop();
        });
        return;
      }

      const text = spokenVoiceoverText(scene.finalScript);
      if (!text) {
        setError("Add a script before previewing the voiceover.");
        return;
      }
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setError("This browser cannot play a spoken voiceover preview.");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        if (playingIdRef.current === scene.id) stop();
      };
      utterance.onerror = () => {
        if (playingIdRef.current === scene.id) stop();
      };
      playingIdRef.current = scene.id;
      setPlayingId(scene.id);
      speakTimerRef.current = window.setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);
    },
    [stop],
  );

  return { playingId, error, preview, stop };
}
