"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ToolCallState } from "@/lib/agent/types";

export function ToolCallCard({ tool }: { tool: ToolCallState }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const running = tool.status === "running";
  const label = running ? tool.label : tool.summary || tool.label;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground"
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
          <AnimatePresence mode="wait" initial={false}>
            {running ? (
              <motion.span
                key="spin"
                className="h-3.5 w-3.5 rounded-full border-2 border-white/15 border-t-foreground"
                animate={reduced ? undefined : { rotate: 360 }}
                transition={reduced ? undefined : { repeat: Infinity, duration: 0.7, ease: "linear" }}
              />
            ) : tool.status === "error" ? (
              <motion.span key="err" className="text-accent">
                !
              </motion.span>
            ) : (
              <motion.svg
                key="ok"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 text-success"
                initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: reduced ? 0 : 0.16 }}
              >
                <path
                  d="M3.5 8.2 6.4 11l6.1-6.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted">{tool.name}</span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <div className="space-y-2 border-t border-border px-3 py-2">
          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-muted">
            {JSON.stringify({ args: tool.args, result: tool.result ?? null }, null, 2)}
          </pre>
        </div>
      </motion.div>
    </div>
  );
}
