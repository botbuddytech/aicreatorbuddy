"use client";

import { useEffect, useState } from "react";

function PlayMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M7 5.15v5.7L11.15 8 7 5.15z" fill="currentColor" />
    </svg>
  );
}

function StopMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x="5.55" y="5.55" width="4.9" height="4.9" rx="1" fill="currentColor" />
    </svg>
  );
}

export function ListenButton({
  playing,
  loading,
  disabled,
  onClick,
}: {
  playing: boolean;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const label = loading ? "Building…" : playing ? "Stop" : "Listen";
  return (
    <button
      type="button"
      aria-label={loading ? "Building Qwen voice" : playing ? "Stop Qwen voice" : "Listen with Qwen"}
      disabled={disabled && !playing && !loading}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#7c3aed]/45 bg-[#7c3aed]/10 px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-[#7c3aed]/20 disabled:opacity-60"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/providers/qwen.svg" alt="" className="h-3.5 w-3.5 shrink-0" />
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent text-[#c4b5fd]"
          aria-hidden
        />
      ) : playing ? (
        <StopMark />
      ) : (
        <PlayMark />
      )}
      {label}
    </button>
  );
}

export function VoiceBuildClock() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="ml-1 tabular-nums text-muted">{seconds}s</span>;
}
