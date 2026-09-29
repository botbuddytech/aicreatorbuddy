export type DictionaryEntry = {
  word: string;
  frequency: number;
  language?: string;
  category?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type PhraseEntry = {
  phrase: string;
  frequency: number;
};

export type SuggestionSource = "dictionary" | "personal" | "phrase";

export type Suggestion = {
  /** Text inserted into the field, with the user's capitalization applied. */
  text: string;
  /** Dictionary or phrase form stored in local history. */
  canonical: string;
  score: number;
  source: SuggestionSource;
  replaceStart: number;
  replaceEnd: number;
};

export type SuggestionRequest = {
  text: string;
  cursorPosition?: number;
  limit?: number;
};

export type SuggestionResult = {
  currentWord: string;
  tokenRange: { start: number; end: number };
  isCompleteWord: boolean;
  suggestions: Suggestion[];
};

export type RankingWeights = {
  prefixWeight: number;
  frequencyWeight: number;
  userWeight: number;
  recencyWeight: number;
  contextWeight: number;
};
