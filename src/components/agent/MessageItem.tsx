"use client";

import { memo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  acceptAllChanges,
  acceptChange,
  rejectAllChanges,
  rejectChange,
  restoreCheckpoint,
} from "@/components/agent/applyProjectChange";
import { DiffCard } from "@/components/agent/DiffCard";
import { Markdown } from "@/components/agent/Markdown";
import { editAgentMessage, retryAgentMessage } from "@/components/agent/run";
import { useAgentStore } from "@/components/agent/store";
import { ToolCallCard } from "@/components/agent/ToolCallCard";
import { agentModelLabel } from "@/lib/agent/types";
import { formatUsdEstimate } from "@/lib/apiCost";

function HoverActions({ children }: { children: ReactNode }) {
  return (
    <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      {children}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-6 items-center rounded-md px-1.5 text-[11px] text-muted hover:bg-white/5 hover:text-foreground"
    >
      {children}
    </button>
  );
}

export const MessageItem = memo(function MessageItem({
  id,
  threadId,
}: {
  id: string;
  threadId: string;
}) {
  const message = useAgentStore((state) => {
    const thread = state.threads.find((item) => item.id === threadId);
    return thread?.messages.find((item) => item.id === id);
  });
  const live = useAgentStore((state) =>
    state.streamingMessageId === id ? state.streamingText : null,
  );
  const thinking = useAgentStore(
    (state) => state.streamingMessageId === id && state.streamingStatus === "thinking",
  );
  const busy = useAgentStore((state) => state.streamingStatus !== "idle");
  const reduced = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message?.content ?? "");
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const text = live ?? message.content;
  const streaming = live !== null;
  const pending = (message.changes ?? []).filter((change) => change.status === "pending");
  const modelLabel = message.cost?.model ? agentModelLabel(message.cost.model) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
      className={`group relative ${message.role === "user" ? "flex justify-end" : ""}`}
    >
      {message.role === "user" ? (
        <div className="relative max-w-[90%]">
          {editing ? (
            <div className="rounded-xl border border-border bg-surface-soft p-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                className="w-full resize-none bg-transparent text-[13px] text-foreground outline-none"
                aria-label="Edit message"
              />
              <div className="mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  className="text-[11px] text-muted hover:text-foreground"
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-foreground hover:text-accent"
                  onClick={() => {
                    setEditing(false);
                    void editAgentMessage(message.id, draft);
                  }}
                >
                  Save and resend
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-surface-soft px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">
                {message.content}
              </div>
              <HoverActions>
                <IconAction label="Edit message" onClick={() => !busy && setEditing(true)}>
                  Edit
                </IconAction>
                <IconAction label={copied ? "Copied" : "Copy message"} onClick={() => void copy()}>
                  {copied ? "Copied" : "Copy"}
                </IconAction>
              </HoverActions>
            </>
          )}
        </div>
      ) : (
        <div className="relative min-w-0 flex-1 space-y-2 pr-1">
          <HoverActions>
            <IconAction
              label="Retry"
              onClick={() => {
                if (!busy) void retryAgentMessage(message.id);
              }}
            >
              Retry
            </IconAction>
            <IconAction label={copied ? "Copied" : "Copy message"} onClick={() => void copy()}>
              {copied ? "Copied" : "Copy"}
            </IconAction>
          </HoverActions>
          {thinking && !text ? (
            <p className="agent-thinking text-[13px] font-medium">Thinking…</p>
          ) : null}
          {text ? <Markdown text={text} streaming={streaming} /> : null}
          {(message.toolCalls ?? []).map((tool) => (
            <ToolCallCard key={tool.id} tool={tool} />
          ))}
          {pending.length > 1 ? (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => rejectAllChanges(threadId, message.id)}
                className="text-[11px] font-semibold text-muted hover:text-foreground"
              >
                Reject all
              </button>
              <button
                type="button"
                onClick={() => acceptAllChanges(threadId, message.id)}
                className="text-[11px] font-semibold text-foreground hover:text-accent"
              >
                Accept all
              </button>
            </div>
          ) : null}
          {(message.changes ?? []).map((change) => (
            <DiffCard
              key={change.id}
              change={change}
              onAccept={() => acceptChange(threadId, message.id, change.id)}
              onReject={() => rejectChange(threadId, message.id, change.id)}
            />
          ))}
          {message.error ? (
            <p className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-[12px] text-accent" role="alert">
              {message.error}
            </p>
          ) : null}
          {message.cost ? (
            <p className="text-[11px] tabular-nums text-muted">
              {modelLabel ? `${modelLabel} · ` : ""}
              {message.cost.tokens} tokens · {formatUsdEstimate(message.cost.usd)}
            </p>
          ) : null}
          {message.checkpointId ? (
            <button
              type="button"
              onClick={() => restoreCheckpoint(threadId, message.id)}
              className="text-[11px] font-semibold text-muted hover:text-foreground"
            >
              Restore checkpoint
            </button>
          ) : null}
        </div>
      )}
    </motion.article>
  );
});
