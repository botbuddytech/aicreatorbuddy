"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { agentModelLabel } from "@/lib/agent/types";
import { activeThread, useAgentStore } from "@/components/agent/store";

function Menu({
  label,
  align = "end",
  children,
}: {
  label: string;
  align?: "start" | "end";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex max-w-[9rem] items-center gap-1 truncate rounded-lg px-2 py-1 text-[12px] text-muted hover:bg-white/5 hover:text-foreground"
      >
        <span className="truncate">{label}</span>
        <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={`absolute top-full z-30 mt-1 max-h-64 w-52 overflow-auto rounded-xl border border-border bg-surface py-1 shadow-none ${
            align === "start" ? "left-0" : "right-0"
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function AgentHeader({ onClose }: { onClose: () => void }) {
  const modelId = useAgentStore((state) => state.modelId);
  const threads = useAgentStore((state) => state.threads);
  const activeId = useAgentStore((state) => state.activeThreadId);
  const thread = useAgentStore(activeThread);
  const newThread = useAgentStore((state) => state.newThread);
  const selectThread = useAgentStore((state) => state.selectThread);
  const modelLabel = agentModelLabel(modelId);

  return (
    <header className="relative z-20 flex items-center gap-1 border-b border-border px-2 py-2">
      <h2 className="px-1 text-[13px] font-semibold text-foreground">Agent</h2>
      <span className="truncate px-2 text-[12px] text-muted" title={modelLabel}>
        {modelLabel}
      </span>
      <div className="ml-auto flex items-center">
        <button
          type="button"
          onClick={newThread}
          className="rounded-lg px-2 py-1 text-[12px] font-medium text-muted hover:bg-white/5 hover:text-foreground"
        >
          New chat
        </button>
        <Menu label={thread?.title ?? "History"}>
          {threads.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-muted">No chats yet</p>
          ) : (
            threads.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => selectThread(item.id)}
                className={`block w-full truncate px-3 py-1.5 text-left text-[13px] hover:bg-white/5 ${
                  item.id === activeId ? "text-foreground" : "text-muted"
                }`}
              >
                {item.title}
              </button>
            ))
          )}
        </Menu>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close agent"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
