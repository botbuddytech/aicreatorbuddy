"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ToolCallState } from "@/lib/agent/types";

export function ToolCallCard({ tool }: { tool: ToolCallState }) {
  const reduced = useReducedMotion();
  const running = tool.status === "running";
  const failed = tool.status === "error";
  const text = running
    ? `Calling ${tool.label}…`
    : failed
      ? `${tool.label} failed`
      : tool.label;

  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3 py-2.5"
      role="status"
      aria-live="polite"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
        {running ? (
          <motion.span
            className="h-3.5 w-3.5 rounded-full border-2 border-white/15 border-t-foreground"
            animate={reduced ? undefined : { rotate: 360 }}
            transition={reduced ? undefined : { repeat: Infinity, duration: 0.7, ease: "linear" }}
          />
        ) : failed ? (
          <span className="text-[13px] font-semibold text-accent">!</span>
        ) : (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-success" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3.5 8.2 6.4 11l6.1-6.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={`min-w-0 flex-1 truncate text-[13px] ${running ? "text-foreground" : "text-muted"}`}>
        {text}
      </span>
    </div>
  );
}
