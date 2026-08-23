"use client";

import { useState, type ReactNode } from "react";
import { useDashboardUi } from "@/components/dashboard/dashboardUi";
import { workspaceChannels } from "@/lib/dashboardContent";

export function Topbar({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const ui = useDashboardUi();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("all");

  const activeLabel =
    activeId === "all"
      ? "All channels"
      : workspaceChannels.find((c) => c.id === activeId)?.name ?? "All channels";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {ui ? (
            <button
              type="button"
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-foreground lg:hidden"
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
          <div className="min-w-0">
            {typeof title === "string" ? (
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {title}
              </h1>
            ) : (
              title
            )}
            {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
          {actions ? <div className="w-full shrink-0 sm:w-auto">{actions}</div> : null}
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-white/5"
            >
              <span className="h-2 w-2 rounded-full bg-success" />
              {activeLabel}
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {open ? (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-surface p-1 shadow-xl">
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

          <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
            <input
              type="search"
              placeholder="Search workspace…"
              className="glass-field min-w-0 flex-1 rounded-xl border border-white/12 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50 lg:w-56 lg:flex-none"
            />

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
              DU
            </div>
          </div>
          </div>
        </div>
      </div>
    </header>
  );
}
