"use client";

import { PROVIDER_LABELS, type AiProvider } from "@/lib/videoProject";

export function ProviderPicker({
  providers,
  value,
  onChange,
}: {
  providers: AiProvider[];
  value: AiProvider;
  onChange: (provider: AiProvider) => void;
}) {
  if (providers.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-border bg-surface-soft p-1">
        {providers.map((provider) => {
          const active = provider === value;
          return (
            <button
              key={provider}
              type="button"
              onClick={() => onChange(provider)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {PROVIDER_LABELS[provider]}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled
        className="rounded-xl border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted disabled:opacity-60"
      >
        + Add integration
      </button>
    </div>
  );
}
