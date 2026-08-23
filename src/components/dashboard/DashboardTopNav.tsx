"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDashboardUi } from "@/components/dashboard/dashboardUi";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { workspaceChannels } from "@/lib/dashboardContent";

export function DashboardTopNav() {
  const router = useRouter();
  const ui = useDashboardUi();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("all");
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const activeLabel =
    activeId === "all"
      ? "All channels"
      : workspaceChannels.find((channel) => channel.id === activeId)?.name ?? "All channels";

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
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

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(
      query ? `/dashboard/library?q=${encodeURIComponent(query)}` : "/dashboard/library",
    );
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        {ui ? (
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-foreground lg:hidden"
            aria-label={ui.mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={ui.mobileNavOpen}
            onClick={ui.toggleMobileNav}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              {ui.mobileNavOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        ) : null}

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-white/5"
            >
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="hidden max-w-[10rem] truncate sm:inline">{activeLabel}</span>
              <span className="sm:hidden">Channels</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {open ? (
              <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-border bg-surface p-1 shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-white/5"
                  onClick={() => {
                    setActiveId("all");
                    setOpen(false);
                  }}
                >
                  All channels
                </button>
                {workspaceChannels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-white/5"
                    onClick={() => {
                      setActiveId(channel.id);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${channel.color}`}
                    >
                      {channel.initials}
                    </span>
                    {channel.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form onSubmit={onSearch} className="min-w-0 flex-1 lg:max-w-56 lg:flex-none">
            <label htmlFor="workspace-search" className="sr-only">
              Search workspace
            </label>
            <input
              id="workspace-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search workspace…"
              className="glass-field w-full rounded-xl border border-white/12 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50"
            />
          </form>

          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
