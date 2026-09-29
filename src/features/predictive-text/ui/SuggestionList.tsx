"use client";

type ListedSuggestion = {
  text: string;
  canonical: string;
  source: string;
  kind?: "word" | "phrase";
};

type SuggestionListProps = {
  id: string;
  suggestions: readonly ListedSuggestion[];
  activeIndex: number;
  onHover: (index: number) => void;
  onPick: (index: number) => void;
};

export function SuggestionList({
  id,
  suggestions,
  activeIndex,
  onHover,
  onPick,
}: SuggestionListProps) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Suggestions"
      className="absolute top-full right-0 left-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/12 bg-surface p-1 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.85)]"
    >
      {suggestions.map((suggestion, index) => {
        const active = index === activeIndex;
        const showPhraseLabel =
          suggestion.kind === "phrase" &&
          suggestions.slice(0, index).every((item) => item.kind !== "phrase") &&
          suggestions.some((item) => item.kind !== "phrase");
        return (
          <li key={`${suggestion.kind ?? "word"}:${suggestion.source}:${suggestion.canonical}:${index}`} role="presentation">
            {showPhraseLabel ? (
              <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">
                Suggestions
              </p>
            ) : null}
            <button
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={active}
              tabIndex={-1}
              className={`flex min-h-10 w-full cursor-pointer items-center rounded-lg px-3 text-left text-sm text-foreground ${
                active ? "bg-white/10" : "hover:bg-white/[0.06]"
              }`}
              onMouseEnter={() => onHover(index)}
              onPointerDown={(event) => {
                event.preventDefault();
                onPick(index);
              }}
            >
              {suggestion.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
