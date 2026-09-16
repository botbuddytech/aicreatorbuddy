"use client";

import { useEffect, useState } from "react";

function readVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const seen = new Set<string>();
  const preferred = navigator.language?.toLowerCase() ?? "en";
  const preferredBase = preferred.split("-")[0] ?? "en";

  return window.speechSynthesis
    .getVoices()
    .filter((voice) => {
      if (!voice.voiceURI || seen.has(voice.voiceURI)) return false;
      seen.add(voice.voiceURI);
      return true;
    })
    .sort((a, b) => {
      const aLang = a.lang.toLowerCase();
      const bLang = b.lang.toLowerCase();
      const aScore =
        (aLang === preferred ? 2 : 0) + (aLang.startsWith(preferredBase) ? 1 : 0);
      const bScore =
        (bLang === preferred ? 2 : 0) + (bLang.startsWith(preferredBase) ? 1 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return a.name.localeCompare(b.name);
    });
}

/** Label shown in the voice picker, e.g. "Samantha (en-US)". */
export function voiceLabel(voice: SpeechSynthesisVoice) {
  const lang = voice.lang?.trim();
  return lang ? `${voice.name} (${lang})` : voice.name;
}

/** Look up a saved voiceURI from the current browser voice list. */
export function resolveVoice(voiceId: string | null | undefined): SpeechSynthesisVoice | null {
  if (!voiceId) return null;
  return readVoices().find((voice) => voice.voiceURI === voiceId) ?? null;
}

/**
 * Browser speech voices. Chrome often returns [] on the first getVoices()
 * call, so we also subscribe to voiceschanged.
 */
export function useSpeechVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const refresh = () => setVoices(readVoices());
    refresh();

    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    // Some engines only fire the legacy handler.
    const previous = window.speechSynthesis.onvoiceschanged;
    window.speechSynthesis.onvoiceschanged = refresh;

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
      window.speechSynthesis.onvoiceschanged = previous;
    };
  }, []);

  return voices;
}
