"use client";

import type { AnalyticsSection } from "@/lib/channelAnalyticsContent";
import type { ChannelStatus } from "@/lib/dashboardContent";

const NAV: { id: AnalyticsSection; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z" },
  { id: "audience", label: "Audience", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { id: "engagement", label: "Engagement", icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" },
  { id: "traffic", label: "Traffic sources", icon: "M18 20V10M12 20V4M6 20v-6" },
];

export function ChannelAnalyticsSidebar({
  channel,
  section,
  onSectionChange,
  onBack,
}: {
  channel: ChannelStatus;
  section: AnalyticsSection;
  onSectionChange: (id: AnalyticsSection) => void;
  onBack: () => void;
}) {
  return (
    <aside className="rounded-2xl border border-border bg-surface p-3">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-white/5 hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All channels
      </button>

      <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-soft px-3 py-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${channel.color}`}
        >
          {channel.initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-foreground">{channel.name}</p>
          <p className="text-[11px] text-muted">
            {channel.connected ? `Synced ${channel.lastSync}` : "Disconnected"}
          </p>
        </div>
      </div>

      <nav className="space-y-1">
        {NAV.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-accent/15 text-accent" : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
