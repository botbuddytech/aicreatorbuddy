"use client";

import { MENTIONS, type MentionId } from "@/lib/agent/types";

export function MentionMenu({
  query,
  activeIndex,
  onPick,
}: {
  query: string;
  activeIndex: number;
  onPick: (id: MentionId) => void;
}) {
  const items = MENTIONS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      role="listbox"
      aria-label="Add context"
      className="absolute bottom-full left-0 z-10 mb-2 w-52 overflow-hidden rounded-xl border border-border bg-surface shadow-none"
    >
      {items.length === 0 ? (
        <p className="px-3 py-2 text-[12px] text-muted">No matches</p>
      ) : (
        items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(item.id);
            }}
            className={`flex w-full items-center px-3 py-1.5 text-left text-[13px] ${
              index === activeIndex ? "bg-white/5 text-foreground" : "text-muted hover:bg-white/5"
            }`}
          >
            @{item.label}
          </button>
        ))
      )}
    </div>
  );
}

export function mentionChoices(query: string) {
  return MENTIONS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
}
