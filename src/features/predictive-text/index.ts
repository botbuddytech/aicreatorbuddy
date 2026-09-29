export { PredictiveEngine } from "./core/PredictiveEngine";
export type { PredictiveEngineOptions } from "./core/PredictiveEngine";
export { Trie } from "./trie/Trie";
export type { TrieMatch } from "./trie/Trie";
export type { DictionaryProvider } from "./dictionary/DictionaryProvider";
export { LocalDictionaryProvider } from "./dictionary/LocalDictionaryProvider";
export { DEFAULT_WEIGHTS } from "./ranking/weights";
export type { ContextRanker } from "./context/ContextRanker";
export { PhraseContextRanker } from "./context/PhraseContextRanker";
export { PhrasePredictor } from "./phrase/PhrasePredictor";
export {
  LocalStorageUserVocabulary,
  MemoryUserVocabulary,
} from "./personalization/UserVocabulary";
export type { UserVocabulary, UserVocabEntry } from "./personalization/UserVocabulary";
export { applySuggestion } from "./integration/applySuggestion";
export { moveActiveIndex, suggestionKeyAction } from "./integration/suggestionKeys";
export type {
  DictionaryEntry,
  PhraseEntry,
  RankingWeights,
  Suggestion,
  SuggestionRequest,
  SuggestionResult,
  SuggestionSource,
} from "./types";
