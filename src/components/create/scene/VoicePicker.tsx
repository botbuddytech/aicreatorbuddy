"use client";

import { useSpeechVoices, voiceLabel } from "@/lib/speechVoices";
import type { Scene } from "@/lib/videoProject";
import { useVideoProject } from "@/components/create/VideoProjectProvider";

export function VoicePicker({
  scene,
  onVoiceChange,
}: {
  scene: Scene;
  /** Called when the voice changes (e.g. stop a stale Listen preview). */
  onVoiceChange?: () => void;
}) {
  const { dispatch } = useVideoProject();
  const voices = useSpeechVoices();
  const loading = voices.length === 0;
  const value = scene.voiceover.voiceId ?? "";

  return (
    <select
      aria-label="Voiceover voice"
      disabled={loading}
      value={loading ? "" : value}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onChange={(event) => {
        const next = event.target.value || null;
        dispatch({
          type: "PATCH_SCENE",
          id: scene.id,
          patch: {
            voiceover: {
              provider: next ? "browser" : null,
              voiceId: next,
            },
          },
        });
        onVoiceChange?.();
      }}
      className="max-w-[11rem] rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-foreground outline-none hover:bg-white/5 focus:border-accent/50 disabled:opacity-60"
    >
      {loading ? (
        <option value="">Loading voices…</option>
      ) : (
        <>
          <option value="">Default voice</option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voiceLabel(voice)}
            </option>
          ))}
        </>
      )}
    </select>
  );
}
