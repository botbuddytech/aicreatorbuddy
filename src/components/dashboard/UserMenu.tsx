"use client";

import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AUTH_STORAGE_KEY, demoProfile } from "@/lib/dashboardContent";

const itemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-white/5";

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75">
      {children}
    </svg>
  );
}

export function UserMenu() {
  const router = useRouter();
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

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setOpen(false);
    router.push("/");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent transition-colors hover:bg-accent/30 ${
          open ? "ring-2 ring-accent/40" : ""
        }`}
      >
        {demoProfile.initials}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
        >
          <div className="flex flex-col items-center px-5 pt-5 pb-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-accent">
              {demoProfile.initials}
            </span>
            <p className="mt-3 text-base font-semibold text-foreground">{demoProfile.name}</p>
            <p className="mt-0.5 w-full truncate text-sm text-foreground">{demoProfile.email}</p>
          </div>
          <div className="border-t border-white/12 p-1.5">
            <Link
              role="menuitem"
              href="/dashboard/settings"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <MenuIcon>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </MenuIcon>
              Profile
            </Link>
            <Link
              role="menuitem"
              href="/dashboard/settings"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <MenuIcon>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </MenuIcon>
              Settings
            </Link>
            <button type="button" role="menuitem" className={itemClass} onClick={logout}>
              <MenuIcon>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </MenuIcon>
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
