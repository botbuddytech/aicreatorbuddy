"use client";

import { activeThread, useAgentStore } from "@/components/agent/store";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { MENTIONS } from "@/lib/agent/types";
import { STEPS } from "@/lib/videoProject";

export function ContextChips() {
  const { project, activeStep } = useVideoProject();
  const thread = useAgentStore(activeThread);
  const channelName = useAgentStore((state) => state.channelName);
  const removeChip = useAgentStore((state) => state.removeChip);
  if (!thread) return null;

  const index = STEPS.findIndex((step) => step.id === activeStep);
  const step = STEPS[index];
  const chips: { id: string; label: string }[] = [];
  if (step && !thread.dismissedChips.includes("step")) {
    chips.push({
      id: "step",
      label: `Step ${String(index + 1).padStart(2, "0")} · ${step.label}`,
    });
  }
  if (channelName && !thread.dismissedChips.includes("channel")) {
    chips.push({ id: "channel", label: `Channel: ${channelName}` });
  }
  if (project.summary.topic.trim() && !thread.dismissedChips.includes("brief")) {
    chips.push({ id: "brief", label: "Brief" });
  }
  for (const mention of thread.mentions) {
    const meta = MENTIONS.find((item) => item.id === mention);
    if (!meta) continue;
    chips.push({ id: `mention:${mention}`, label: `@${meta.label}` });
  }
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-2">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-surface-soft py-0.5 pr-1 pl-2 text-[11px] text-foreground"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            aria-label={`Remove ${chip.label}`}
            onClick={() => removeChip(chip.id)}
            className="rounded-full px-1 text-muted hover:text-foreground"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
