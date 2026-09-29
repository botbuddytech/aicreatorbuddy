"use client";

import { useAgentStore } from "@/components/agent/store";

export function AgentToggle() {
  const open = useAgentStore((state) => state.panelOpen);
  const toggle = useAgentStore((state) => state.togglePanel);

  return (
    <button
      id="agent-panel-toggle"
      type="button"
      aria-expanded={open}
      aria-controls="agent-panel"
      title="Toggle agent (⌘I or Ctrl+I)"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
        open
          ? "border-accent/50 bg-accent/10 text-foreground"
          : "border-border bg-surface text-foreground hover:border-white/20"
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M8 1.8 9.1 6 13.2 7.1 9.1 8.2 8 12.4 6.9 8.2 2.8 7.1 6.9 6 8 1.8Z" strokeLinejoin="round" />
      </svg>
      Agent
    </button>
  );
}
