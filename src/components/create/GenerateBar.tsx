"use client";

import type { ReactNode } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { ProviderPicker } from "@/components/create/ProviderPicker";
import type { AiProvider } from "@/lib/videoProject";

export function GenerateBar<T extends string = AiProvider>({
  providers,
  provider,
  onProviderChange,
  providerLabels,
  showProviderIcons = false,
  onGenerate,
  generating,
  hasOutput,
  generateLabel = "Generate",
  regenerateLabel = "Regenerate",
  generateDisabled = false,
  hideGenerate = false,
  error,
  extra,
}: {
  providers: readonly T[];
  provider: T;
  onProviderChange: (provider: T) => void;
  providerLabels?: Partial<Record<T, string>>;
  showProviderIcons?: boolean;
  onGenerate: () => void;
  generating: boolean;
  hasOutput: boolean;
  generateLabel?: string;
  regenerateLabel?: string;
  generateDisabled?: boolean;
  hideGenerate?: boolean;
  error?: string | null;
  extra?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ProviderPicker
          providers={providers}
          value={provider}
          onChange={onProviderChange}
          labels={providerLabels}
          showIcons={showProviderIcons}
        />
        <div className="flex flex-wrap gap-2">
          {extra}
          {hideGenerate ? null : (
            <ActionButton
              onClick={onGenerate}
              loading={generating}
              loadingLabel="Generating…"
              disabled={generateDisabled}
              title={generateDisabled ? "This generator is turned off for now." : undefined}
            >
              {generateDisabled || !hasOutput ? generateLabel : regenerateLabel}
            </ActionButton>
          )}
        </div>
      </div>
      {error ? (
        <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}{" "}
          {generateDisabled || hideGenerate ? null : (
            <button type="button" className="font-semibold underline" onClick={onGenerate}>
              Retry
            </button>
          )}
        </p>
      ) : null}
    </div>
  );
}
