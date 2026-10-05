"use client";

import { PROVIDER_LABELS, type AiProvider } from "@/lib/videoProject";

const PROVIDER_ICON_SRC: Record<string, string> = {
  chatgpt: "/icons/providers/chatgpt.svg",
  gemini: "/icons/providers/gemini.png",
  cursor: "/icons/providers/cursor.png",
  vidiq: "/icons/providers/vidiq.png",
};

function ProviderIcon({ id }: { id: string }) {
  const src = PROVIDER_ICON_SRC[id];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-4 w-4 shrink-0 rounded-[4px] object-contain"
    />
  );
}

export function ProviderPicker<T extends string = AiProvider>({
  providers,
  value,
  onChange,
  labels,
  showIcons = false,
}: {
  providers: readonly T[];
  value: T;
  onChange: (provider: T) => void;
  labels?: Partial<Record<T, string>>;
  showIcons?: boolean;
}) {
  if (providers.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-border bg-surface-soft p-1">
        {providers.map((provider) => {
          const active = provider === value;
          const label =
            labels?.[provider] ??
            (provider in PROVIDER_LABELS
              ? PROVIDER_LABELS[provider as AiProvider]
              : provider);
          return (
            <button
              key={provider}
              type="button"
              onClick={() => onChange(provider)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {showIcons ? <ProviderIcon id={provider} /> : null}
              {label}
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
