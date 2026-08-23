"use client";

import type { ReactNode } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { ProviderPicker } from "@/components/create/ProviderPicker";
import type { AiProvider } from "@/lib/videoProject";

export function GenerateBar({
  providers,
  provider,
  onProviderChange,
  onGenerate,
  generating,
  hasOutput,
  generateLabel = "Generate",
  regenerateLabel = "Regenerate",
  error,
  extra,
}: {
  providers: AiProvider[];
  provider: AiProvider;
  onProviderChange: (provider: AiProvider) => void;
  onGenerate: () => void;
  generating: boolean;
  hasOutput: boolean;
  generateLabel?: string;
  regenerateLabel?: string;
  error?: string | null;
  extra?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ProviderPicker providers={providers} value={provider} onChange={onProviderChange} />
        <div className="flex flex-wrap gap-2">
          {extra}
          <ActionButton
            onClick={onGenerate}
            loading={generating}
            loadingLabel="Generating…"
          >
            {hasOutput ? regenerateLabel : generateLabel}
          </ActionButton>
        </div>
      </div>
      {error ? (
        <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}{" "}
          <button type="button" className="font-semibold underline" onClick={onGenerate}>
            Retry
          </button>
        </p>
      ) : null}
    </div>
  );
}
