"use client";

import { useEffect, useRef, useState } from "react";

const dummyNotifications = [
  {
    id: "upload",
    title: "Scheduled upload is ready",
    detail: "Growth Lab · posts in 45 min",
    time: "2m",
    unread: true,
  },
  {
    id: "draft",
    title: "Draft waiting for review",
    detail: "Studio Core · Q3 recap cut",
    time: "1h",
    unread: true,
  },
  {
    id: "sync",
    title: "Channel analytics synced",
    detail: "All channels · last 28 days",
    time: "3h",
    unread: false,
  },
] as const;

const unreadCount = dummyNotifications.filter((item) => item.unread).length;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open notifications"
        onClick={() => setOpen((value) => !value)}
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-white/5 ${
          open ? "ring-2 ring-accent/40" : ""
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 text-[8px] font-bold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <span className="text-[11px] text-muted">Demo only</span>
          </div>
          <div className="border-t border-white/12 p-1.5">
            {dummyNotifications.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.unread ? "bg-accent" : "bg-border"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    <span className="shrink-0 text-[11px] text-muted">{item.time}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{item.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
