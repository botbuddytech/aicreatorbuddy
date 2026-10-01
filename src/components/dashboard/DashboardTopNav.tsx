"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useDashboardUi } from "@/components/dashboard/dashboardUi";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { UserMenu } from "@/components/dashboard/UserMenu";
import type { ActiveChannelBadge } from "@/lib/youtube/activeChannel";
import { channelInitials } from "@/lib/youtube/format";

function SelectedChannelMark({ channel }: { channel: ActiveChannelBadge }) {
  if (channel.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={channel.thumbnailUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
      {channelInitials(channel.title)}
    </span>
  );
}

export function DashboardTopNav({
  activeChannel,
}: {
  activeChannel: ActiveChannelBadge | null;
}) {
  const router = useRouter();
  const ui = useDashboardUi();
  const headerRef = useRef<HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [barHeight, setBarHeight] = useState(0);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const apply = () => {
      const height = header.getBoundingClientRect().height;
      setBarHeight(height);
      document.documentElement.style.setProperty("--dashboard-nav-height", `${height}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--dashboard-nav-height");
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
    <>
      <div aria-hidden className={barHeight ? undefined : "h-16"} style={barHeight ? { height: barHeight } : undefined} />
      <div
        className="pointer-events-none fixed top-0 z-20 left-[var(--sidebar-width,0px)] right-[var(--agent-panel-width,0px)]"
        style={{ transition: "right var(--agent-panel-ms, 220ms) ease-out" }}
      >
        <header
          ref={headerRef}
          className="pointer-events-auto border-b border-border bg-background/90 backdrop-blur-md"
        >
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

            <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-surface py-1 pl-1 pr-3">
              {activeChannel ? (
                <SelectedChannelMark channel={activeChannel} />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted">
                  —
                </span>
              )}
              <span className="min-w-0 leading-tight">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Selected channel
                </span>
                <span className="block max-w-[8.5rem] truncate text-sm font-semibold text-foreground sm:max-w-[14rem]">
                  {activeChannel?.title ?? "None selected"}
                </span>
              </span>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
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
      </div>
    </>
  );
}
