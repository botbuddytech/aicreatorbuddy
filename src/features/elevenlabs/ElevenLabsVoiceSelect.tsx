"use client";

import { useEffect, useState } from "react";
import type { ElevenLabsVoiceListItem } from "@/features/elevenlabs/contract";
import type { ElevenLabsVoice } from "@/lib/videoProject";

export function ElevenLabsVoiceSelect({
  value,
  onChange,
}: {
  value: ElevenLabsVoice | null;
  onChange: (voice: ElevenLabsVoice | null) => void;
}) {
  const [voices, setVoices] = useState<ElevenLabsVoiceListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/elevenlabs/voices", {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        const body = (await response.json()) as { voices?: ElevenLabsVoiceListItem[]; error?: unknown };
        if (!response.ok) {
          throw new Error(
            typeof body.error === "string" ? body.error : "Could not load ElevenLabs voices.",
          );
        }
        if (!Array.isArray(body.voices)) throw new Error("Could not load ElevenLabs voices.");
        if (controller.signal.aborted) return;
        setVoices(body.voices);
        setError(null);
        setStatus("ready");
      } catch (caught) {
        if (controller.signal.aborted) return;
        console.error("[elevenlabs] voice list failed", caught);
        setError(caught instanceof Error ? caught.message : "Could not load ElevenLabs voices.");
        setStatus("error");
      }
    })();
    return () => controller.abort();
  }, []);

  const selectedId = value?.voiceId ?? "";
  const options =
    value && !voices.some((voice) => voice.voiceId === value.voiceId)
      ? [{ voiceId: value.voiceId, name: value.name, category: null }, ...voices]
      : voices;

  return (
    <label
      title={error ?? "ElevenLabs voice"}
      className="inline-flex max-w-full items-center gap-2 rounded-xl border border-accent/50 bg-accent/10 px-2.5 py-1"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/providers/elevenlabs.svg" alt="" className="h-4 w-4 shrink-0" />
      <span className="text-xs font-bold text-accent">ElevenLabs</span>
      <select
        aria-label="ElevenLabs voice"
        disabled={status === "loading"}
        value={selectedId}
        onChange={(event) => {
          const voiceId = event.target.value;
          if (!voiceId) {
            onChange(null);
            return;
          }
          const match = options.find((voice) => voice.voiceId === voiceId);
          onChange(
            match
              ? { voiceId: match.voiceId, name: match.name }
              : value?.voiceId === voiceId
                ? value
                : null,
          );
        }}
        className="max-w-[14rem] bg-transparent text-xs font-semibold text-foreground outline-none disabled:opacity-60"
      >
        {status === "loading" ? (
          <option value={selectedId}>{value?.name ?? "Loading voices…"}</option>
        ) : (
          <>
            <option value="">
              {status === "error" ? (error ?? "Voices unavailable") : "Choose ElevenLabs voice"}
            </option>
            {options.map((voice) => (
              <option key={voice.voiceId} value={voice.voiceId}>
                {voice.name}
              </option>
            ))}
          </>
        )}
      </select>
    </label>
  );
}
