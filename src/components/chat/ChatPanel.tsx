"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { getPageContext } from "@/lib/chat/pageContext";
import type { ChatMessage, ChatRole } from "@/lib/chat/types";

const STORAGE_KEY = "acb_buddy_chat";

type ThreadMessage = ChatMessage & { id: string };

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `m-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function loadThread(pathname: string): ThreadMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ThreadMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  const ctx = getPageContext(pathname);
  return [{ id: "greet", role: "assistant", content: ctx.greeting }];
}

function patchThread(prev: ThreadMessage[] | null, id: string, content: string): ThreadMessage[] {
  return (prev ?? []).map((message) => (message.id === id ? { ...message, content } : message));
}

function BuddyAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-10 w-10" : "h-8 w-8";
  return (
    <span className={`relative inline-flex ${dim} shrink-0`}>
      <span className="flex h-full w-full items-center justify-center rounded-full bg-accent text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
        <svg viewBox="0 0 24 24" className={size === "md" ? "h-5 w-5" : "h-4 w-4"} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="5" y="8" width="14" height="11" rx="3.5" />
          <path d="M12 8V5" />
          <circle cx="12" cy="4" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="9.25" cy="13" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="14.75" cy="13" r="1.1" fill="currentColor" stroke="none" />
          <path d="M9 16.25h6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#12151c] bg-success" />
    </span>
  );
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const list = lines.filter((line) => /^\s*(?:[-•*]|\d+\.)\s/.test(line));
        if (list.length === lines.length && lines.length > 1) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-4">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\s*(?:[-•*]|\d+\.)\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Buddy is typing">
      <span className="buddy-typing-dot" />
      <span className="buddy-typing-dot" />
      <span className="buddy-typing-dot" />
    </span>
  );
}

function Bubble({ role, content }: { role: ChatRole; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3 py-2 text-sm leading-relaxed text-white">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <BuddyAvatar />
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-foreground">
        {content ? <RichText text={content} /> : <TypingDots />}
      </div>
    </div>
  );
}

type ChatPanelProps = {
  panelId: string;
  open: boolean;
  onClose: () => void;
};

export function ChatPanel({ panelId, open, onClose }: ChatPanelProps) {
  const pathname = usePathname() ?? "/";
  const reduceMotion = useReducedMotion();
  const inputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stored = useMemo(() => loadThread(pathname), [pathname]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ThreadMessage[] | null>(null);

  const thread = messages ?? stored;
  const ctx = getPageContext(pathname);

  useEffect(() => {
    if (!messages) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [thread, busy, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const typeOut = useCallback(async (id: string, full: string) => {
    if (reduceMotion) {
      setMessages((prev) => patchThread(prev, id, full));
      return;
    }
    const tokens = full.split(/(\s+)/);
    let acc = "";
    for (const token of tokens) {
      acc += token;
      const snapshot = acc;
      setMessages((prev) => patchThread(prev, id, snapshot));
      if (token.trim()) await delay(16);
    }
  }, [reduceMotion]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: ThreadMessage = { id: newId(), role: "user", content };
      const assistantId = newId();
      const history = [...thread, userMessage];

      setDraft("");
      setBusy(true);
      setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);

      try {
        const payload: ChatMessage[] = history.map(({ role, content: body }) => ({ role, content: body }));
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payload, pathname }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("bad status");
        const data = (await response.json()) as { reply?: string };
        const reply = data.reply?.trim() || "Say that another way — I want to get this right.";
        await typeOut(assistantId, reply);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessages((prev) =>
          patchThread(prev, assistantId, "I lost that thought — send it again and I'll pick it up."),
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, pathname, thread, typeOut],
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function onComposerKey(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    }
  }

  function resetThread() {
    abortRef.current?.abort();
    setBusy(false);
    setMessages([{ id: newId(), role: "assistant", content: getPageContext(pathname).greeting }]);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          key="panel"
          id={panelId}
          role="dialog"
          aria-label="Chat with Buddy, YouTube specialist"
          initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#12151c]/95 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl"
          style={{ height: "min(32rem, calc(100dvh - 7.5rem))" }}
        >
          <header className="flex shrink-0 items-start gap-3 border-b border-white/10 px-4 py-3">
            <BuddyAvatar size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold tracking-tight text-foreground">Buddy</p>
              <p className="truncate text-[11px] text-muted">YouTube specialist · {ctx.title}</p>
            </div>
            <button
              type="button"
              onClick={resetThread}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground"
              aria-label="New conversation"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground"
              aria-label="Close chat"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
            {thread.map((message) => (
              <Bubble key={message.id} role={message.role} content={message.content} />
            ))}
          </div>

          {thread.length <= 2 ? (
            <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-white/5 px-4 py-2">
              {ctx.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={busy}
                  onClick={() => void send(chip)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted transition hover:border-white/20 hover:text-foreground disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="shrink-0 border-t border-white/10 p-3">
            <label htmlFor={inputId} className="sr-only">
              Message Buddy
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id={inputId}
                ref={inputRef}
                rows={1}
                value={draft}
                disabled={busy}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onComposerKey}
                placeholder="Ask about hooks, RPM, niches…"
                className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-white/12 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </form>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
