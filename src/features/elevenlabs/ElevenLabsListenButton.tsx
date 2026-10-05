"use client";

export function ElevenLabsListenButton({
  playing,
  loading,
  disabled,
  onClick,
}: {
  playing: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/20 disabled:opacity-60"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/providers/elevenlabs.svg" alt="" className="h-3.5 w-3.5 shrink-0" />
      {loading ? "Speaking…" : playing ? "Stop" : "ElevenLabs Listen"}
    </button>
  );
}
