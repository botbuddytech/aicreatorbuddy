"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { mentionChoices, MentionMenu } from "@/components/agent/MentionMenu";
import { sendAgentMessage, stopAgent } from "@/components/agent/run";
import { useAgentStore } from "@/components/agent/store";
import type { MentionId } from "@/lib/agent/types";

const MAX_HEIGHT = 8 * 22 + 16;

export function Composer() {
  const streaming = useAgentStore((state) => state.streamingStatus !== "idle");
  const addMention = useAgentStore((state) => state.addMention);
  const setMentionOpen = useAgentStore((state) => state.setMentionOpen);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<{ query: string; index: number } | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMentionOpen(menu !== null);
  }, [menu, setMentionOpen]);

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [draft]);

  function syncMenu(value: string, caret: number) {
    const match = /(?:^|\s)@([\w]*)$/.exec(value.slice(0, caret));
    if (!match) {
      setMenu(null);
      return;
    }
    setMenu({ query: match[1] ?? "", index: 0 });
  }

  function pick(id: MentionId) {
    const element = boxRef.current;
    const caret = element?.selectionStart ?? draft.length;
    const at = draft.slice(0, caret).lastIndexOf("@");
    const next = at >= 0 ? `${draft.slice(0, at)}${draft.slice(caret)}` : draft;
    addMention(id);
    setDraft(next);
    setMenu(null);
    requestAnimationFrame(() => {
      const node = boxRef.current;
      if (!node) return;
      const pos = at >= 0 ? at : next.length;
      node.focus();
      node.setSelectionRange(pos, pos);
    });
  }

  function send() {
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft("");
    setMenu(null);
    void sendAgentMessage(text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const choices = menu ? mentionChoices(menu.query) : [];
    if (menu && choices.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setMenu((current) => {
        if (!current) return current;
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const next = (current.index + delta + choices.length) % choices.length;
        return { ...current, index: next };
      });
      return;
    }
    if (menu && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setMenu(null);
      return;
    }
    if (menu && event.key === "Enter" && !event.shiftKey && choices.length > 0) {
      event.preventDefault();
      const choice = choices[menu.index] ?? choices[0];
      if (choice) pick(choice.id);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  function insertAt() {
    const element = boxRef.current;
    const caret = element?.selectionStart ?? draft.length;
    const next = `${draft.slice(0, caret)}@${draft.slice(caret)}`;
    setDraft(next);
    const pos = caret + 1;
    setMenu({ query: "", index: 0 });
    requestAnimationFrame(() => {
      const node = boxRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="relative border-t border-border p-3">
      {menu ? (
        <MentionMenu query={menu.query} activeIndex={menu.index} onPick={pick} />
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-soft">
        <label htmlFor="agent-composer" className="sr-only">
          Message the agent
        </label>
        <textarea
          id="agent-composer"
          ref={boxRef}
          rows={1}
          value={draft}
          placeholder="Message the agent… @ to attach title, script, or brief"
          onChange={(event) => {
            setDraft(event.target.value);
            syncMenu(event.target.value, event.target.selectionStart ?? event.target.value.length);
          }}
          onKeyDown={onKeyDown}
          onClick={(event) => syncMenu(draft, event.currentTarget.selectionStart ?? draft.length)}
          className="max-h-48 w-full resize-none rounded-t-2xl bg-transparent px-3 py-2.5 text-[13px] leading-5 text-foreground outline-none placeholder:text-muted/70"
        />
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <button
            type="button"
            onClick={insertAt}
            aria-label="Attach title, script, thumbnail, brief, or timeline"
            title="Attach title, script, thumbnail, brief, or timeline"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path
                d="M6.2 8.2 10.4 4a1.9 1.9 0 0 1 2.7 2.7L8.2 11.6a2.7 2.7 0 0 1-3.8-3.8l4.4-4.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="ml-auto">
            {streaming ? (
              <ActionButton size="sm" variant="danger" onClick={stopAgent} aria-label="Stop generating">
                Stop
              </ActionButton>
            ) : (
              <ActionButton size="sm" onClick={send} disabled={!draft.trim()} aria-label="Send message">
                Send
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
