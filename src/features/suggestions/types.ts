export interface SuggestionProvider {
  name: string;
  getSuggestions(
    input: string,
    opts?: { signal?: AbortSignal; limit?: number },
  ): Promise<string[]>;
}

export type SuggestionSourceMode = "local" | "remote" | "hybrid";

export type SuggestionKind = "word" | "phrase";

export type ComposedSuggestion = {
  text: string;
  canonical: string;
  kind: SuggestionKind;
  replaceStart: number;
  replaceEnd: number;
  score: number;
  source: "dictionary" | "personal" | "phrase" | "remote";
};
