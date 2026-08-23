"use client";

import { useState, type ReactNode } from "react";
import { ActivityHeatmap } from "@/components/dashboard/scheduler/ActivityHeatmap";
import { AiInsightsPanel } from "@/components/dashboard/scheduler/AiInsightsPanel";
import { TopTimeSlots } from "@/components/dashboard/scheduler/TopTimeSlots";

const TABS = [
  { id: "heatmap", label: "Heatmap View", icon: "grid" },
  { id: "timeline", label: "Timeline View", icon: "line" },
  { id: "recommendations", label: "AI Recommendations", icon: "spark" },
  { id: "history", label: "Post History", icon: "clock" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function TabIcon({ icon }: { icon: (typeof TABS)[number]["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
  } as const;

  if (icon === "grid") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (icon === "line") {
    return (
      <svg {...common}>
        <path d="M4 16l5-5 4 4 7-8" />
        <path d="M4 20h16" />
      </svg>
    );
  }
  if (icon === "spark") {
    return (
      <svg {...common}>
        <path d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function PlaceholderPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-16 text-center">
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}

export function BestTimeBoard() {
  const [tab, setTab] = useState<TabId>("heatmap");

  let content: ReactNode;
  if (tab === "heatmap") {
    content = (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <ActivityHeatmap />
        <div className="space-y-6">
          <AiInsightsPanel />
          <TopTimeSlots />
        </div>
      </div>
    );
  } else if (tab === "timeline") {
    content = (
      <PlaceholderPanel
        title="Timeline view coming soon"
        body="Hour-by-hour audience activity will land here after the heatmap."
      />
    );
  } else if (tab === "recommendations") {
    content = (
      <PlaceholderPanel
        title="AI recommendations coming soon"
        body="Expanded posting plans will appear here. Use the heatmap insights in the meantime."
      />
    );
  } else {
    content = (
      <PlaceholderPanel
        title="Post history coming soon"
        body="Previous publish times and their first-hour performance will show here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-accent text-white"
                  : "border border-border text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <TabIcon icon={item.icon} />
              {item.label}
            </button>
          );
        })}
      </div>
      {content}
    </div>
  );
}
