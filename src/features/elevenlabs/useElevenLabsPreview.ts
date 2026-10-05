"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useElevenLabsPreview() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const generation = useRef(0);
  const playingIdRef = useRef<string | null>(null);
  const loadingIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const releaseAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    generation.current += 1;
    releaseAudio();
    playingIdRef.current = null;
    loadingIdRef.current = null;
    setPlayingId(null);
    setLoadingId(null);
  }, [releaseAudio]);

  useEffect(() => () => stop(), [stop]);

  const preview = useCallback(
    async (sceneId: string, text: string, voiceId: string, durationSeconds: number) => {
      setError(null);
      if (playingIdRef.current === sceneId || loadingIdRef.current === sceneId) {
        stop();
        return;
      }
      stop();
      const token = generation.current;
      loadingIdRef.current = sceneId;
      setLoadingId(sceneId);
      try {
        const response = await fetch("/api/elevenlabs/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            voiceId,
            text,
            durationSeconds: Math.max(1, Math.round(durationSeconds)),
          }),
        });
        if (generation.current !== token) return;
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
          const message =
            typeof body?.error === "string"
              ? body.error
              : "ElevenLabs could not speak this script.";
          throw new Error(message);
        }
        const blob = await response.blob();
        if (generation.current !== token) return;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onloadedmetadata = () => {
          if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
          setDurations((current) => ({ ...current, [sceneId]: audio.duration }));
        };
        audio.onended = () => {
          if (generation.current === token) stop();
        };
        audio.onerror = () => {
          if (generation.current !== token) return;
          setError("Could not play the ElevenLabs voice.");
          stop();
        };
        loadingIdRef.current = null;
        playingIdRef.current = sceneId;
        setLoadingId(null);
        setPlayingId(sceneId);
        await audio.play();
      } catch (caught) {
        if (generation.current !== token) return;
        setError(
          caught instanceof Error ? caught.message : "ElevenLabs could not speak this script.",
        );
        releaseAudio();
        playingIdRef.current = null;
        loadingIdRef.current = null;
        setPlayingId(null);
        setLoadingId(null);
      }
    },
    [releaseAudio, stop],
  );

  return { playingId, loadingId, durations, error, preview, stop };
}
