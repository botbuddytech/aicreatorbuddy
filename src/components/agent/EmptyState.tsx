"use client";

import { suggestionsFor } from "@/lib/agent/suggestions";
import { sendAgentMessage } from "@/components/agent/run";
import { useOptionalVideoProject } from "@/components/create/VideoProjectProvider";

const CREATE_PAGE_SUGGESTIONS = [
  "How does the create pipeline work?",
  "What should I fill in before generating titles?",
  "How do I start a new video draft?",
];

export function EmptyState() {
  const projectState = useOptionalVideoProject();
  const suggestions = projectState
    ? suggestionsFor(projectState.activeStep)
    : CREATE_PAGE_SUGGESTIONS;

  return (
    <div className="flex h-full flex-col justify-end px-3 py-4">
      <p className="text-[13px] font-medium text-foreground">Ask the agent about this step</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">
        It can update this video. Attach title, script, thumbnail, brief, or timeline with @.
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
