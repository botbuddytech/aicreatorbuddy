"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { EmptyState } from "@/components/agent/EmptyState";
import { MessageItem } from "@/components/agent/MessageItem";
import { useAgentStore } from "@/components/agent/store";

export function MessageList() {
  const threadId = useAgentStore((state) => state.activeThreadId);
  const idKey = useAgentStore((state) => {
    const thread = state.threads.find((item) => item.id === state.activeThreadId);
    return thread?.messages.map((message) => message.id).join("\n") ?? "";
  });
  const streamingText = useAgentStore((state) => state.streamingText);
  const streamingStatus = useAgentStore((state) => state.streamingStatus);
  const reduced = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const ids = idKey ? idKey.split("\n") : [];

  function stickToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
    pinnedRef.current = true;
    setShowJump(false);
  }

  function onScroll() {
    const element = scrollerRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const pinned = distance < 64;
    pinnedRef.current = pinned;
    setShowJump(!pinned);
  }

  useEffect(() => {
    if (!pinnedRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "auto", block: "end" });
  }, [idKey, streamingText, streamingStatus, reduced]);

  if (!threadId) return null;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="log"
        aria-relevant="additions"
        aria-label="Agent messages"
        className="h-full overflow-y-auto px-3 py-3"
      >
        {ids.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {ids.map((id) => (
              <MessageItem key={id} id={id} threadId={threadId} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {showJump && ids.length > 0 ? (
        <button
          type="button"
          onClick={stickToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-foreground hover:bg-surface-soft"
        >
          Jump to latest
        </button>
      ) : null}
    </div>
  );
}
