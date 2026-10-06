"use client";

import { QWEN_SPEAKERS } from "@/features/qwen/contract";
import type { QwenVoice } from "@/lib/videoProject";

export function QwenVoiceSelect({
  value,
  onChange,
}: {
  value: QwenVoice;
  onChange: (voice: QwenVoice) => void;
}) {
  return (
    <label
      title="Demo voice. Used by Listen on every scene."
      className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface-soft px-2.5 py-1"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/providers/qwen.svg" alt="" className="h-4 w-4 shrink-0" />
      <span className="text-xs font-bold text-foreground">Qwen</span>
      <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Demo
      </span>
      <select
        aria-label="Qwen demo voice"
        value={value.voiceId}
        onChange={(event) => {
          const match = QWEN_SPEAKERS.find((voice) => voice.id === event.target.value);
          if (!match) return;
          onChange({ voiceId: match.id, name: match.name });
        }}
        className="max-w-[14rem] bg-transparent text-xs font-semibold text-foreground outline-none"
      >
        {QWEN_SPEAKERS.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name}
          </option>
        ))}
      </select>
    </label>
  );
}
