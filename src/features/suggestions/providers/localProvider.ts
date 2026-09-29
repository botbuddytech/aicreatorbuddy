import type { PredictiveEngine } from "@/features/predictive-text/core/PredictiveEngine";
import type { ComposedSuggestion, SuggestionProvider } from "../types";

export type LocalSuggestionProvider = SuggestionProvider & {
  completeAtCaret(text: string, cursorPosition: number, limit?: number): ComposedSuggestion[];
  acceptWords(text: string): void;
};

/** Word-level wrapper. The engine's ranking and caret logic stay unchanged. */
export function createLocalProvider(engine: PredictiveEngine): LocalSuggestionProvider {
  return {
    name: "local",
    async getSuggestions(input, opts) {
      if (opts?.signal?.aborted) return [];
      const result = engine.getSuggestions({
        text: input,
        cursorPosition: input.length,
        limit: opts?.limit,
      });
      return result.suggestions.map((suggestion) => suggestion.text);
    },
    completeAtCaret(text, cursorPosition, limit) {
      const result = engine.getSuggestions({ text, cursorPosition, limit });
      return result.suggestions.map((suggestion) => ({
        text: suggestion.text,
        canonical: suggestion.canonical,
        kind: "word" as const,
        replaceStart: suggestion.replaceStart,
        replaceEnd: suggestion.replaceEnd,
        score: suggestion.score,
        source: suggestion.source,
      }));
    },
    acceptWords(text) {
      for (const word of text.split(/\s+/u)) {
        if (word) engine.accept(word);
      }
    },
  };
}
