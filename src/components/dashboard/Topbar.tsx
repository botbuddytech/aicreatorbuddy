"use client";

import { useState, type ReactNode } from "react";
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
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("all");

  const activeLabel =
    activeId === "all"
      ? "All channels"
      : workspaceChannels.find((c) => c.id === activeId)?.name ?? "All channels";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {typeof title === "string" ? (
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          ) : (
            title
          )}
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {actions}
          <div className="relative">
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

          <input
            type="search"
            placeholder="Search workspace…"
            className="glass-field w-full rounded-xl border border-white/12 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50 sm:w-56"
          />

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
            DU
          </div>
        </div>
      </div>
    </header>
  );
}
