"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const SEEN_KEY = "acb_buddy_seen";

function subscribeNever() {
  return () => {};
}

function prefetchPanel() {
  void import("@/components/chat/ChatPanel");
}

// The animated panel (framer-motion, chat state, message rendering) is only
// needed once a user actually opens the widget, so keep it out of every
// page's initial JS bundle until then.
const ChatPanel = dynamic(() => import("@/components/chat/ChatPanel").then((mod) => mod.ChatPanel));

export function ChatWidget() {
  const panelId = useId();
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  const unread = isClient && !open && sessionStorage.getItem(SEEN_KEY) !== "1";

  useEffect(() => {
    // Warm the chat panel chunk once the browser is idle so opening it
    // later feels instant, without competing with initial page load.
    const hasIdleCallback = typeof window.requestIdleCallback === "function";
    const idleId = hasIdleCallback
      ? window.requestIdleCallback(prefetchPanel)
      : window.setTimeout(prefetchPanel, 3000);
    return () => {
      if (hasIdleCallback) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);

  function toggle() {
    if (!open) {
      sessionStorage.setItem(SEEN_KEY, "1");
      setHasOpenedOnce(true);
    }
    setOpen((was) => !was);
  }

  if (!isClient) return null;

  return createPortal(
    <div className="buddy-root">
      <div className="pointer-events-auto fixed right-4 bottom-[calc(1.25rem+6%)] z-[80] flex flex-col items-end gap-3 sm:right-6 sm:bottom-[calc(1.5rem+6%)]">
        {hasOpenedOnce ? (
          <ChatPanel panelId={panelId} open={open} onClose={() => setOpen(false)} />
        ) : null}

        <button
          type="button"
          onClick={toggle}
          onMouseEnter={prefetchPanel}
          onFocus={prefetchPanel}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close chat" : "Chat with Buddy, YouTube specialist"}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_12px_32px_-8px_rgba(255,59,78,0.85)] transition hover:bg-accent-dark"
        >
          {!open ? <span className="buddy-launcher-ring" aria-hidden /> : null}
          {open ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="5" y="8" width="14" height="11" rx="3.5" />
              <path d="M12 8V5" />
              <circle cx="12" cy="4" r="1.15" fill="currentColor" stroke="none" />
              <circle cx="9.25" cy="13" r="1.1" fill="currentColor" stroke="none" />
              <circle cx="14.75" cy="13" r="1.1" fill="currentColor" stroke="none" />
              <path d="M9 16.25h6" strokeLinecap="round" />
            </svg>
          )}
          {unread ? (
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-success" />
          ) : null}
        </button>
      </div>
    </div>,
    document.body,
  );
}
