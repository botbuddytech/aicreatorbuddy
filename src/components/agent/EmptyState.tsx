"use client";

import { suggestionsFor } from "@/lib/agent/suggestions";
import { sendAgentMessage } from "@/components/agent/run";
import { useVideoProject } from "@/components/create/VideoProjectProvider";

export function EmptyState() {
  const { activeStep } = useVideoProject();
  const suggestions = suggestionsFor(activeStep);

  return (
    <div className="flex h-full flex-col justify-end px-3 py-4">
      <p className="text-[13px] font-medium text-foreground">Ask the agent about this step</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">
        Agent mode can propose edits. Nothing is written until you accept it.
      </p>
      <div className="mt-3 flex flex-col items-start gap-1.5">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void sendAgentMessage(suggestion)}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-[12px] text-foreground hover:border-white/20 hover:bg-surface-soft"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
