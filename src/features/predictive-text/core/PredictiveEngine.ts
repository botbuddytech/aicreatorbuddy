import { applyTypingCase } from "./capitalize";
import { tokenAtCursor } from "./tokenize";
import { PhraseContextRanker } from "../context/PhraseContextRanker";
import type { ContextRanker } from "../context/ContextRanker";
import type { DictionaryProvider } from "../dictionary/DictionaryProvider";
import { LocalDictionaryProvider } from "../dictionary/LocalDictionaryProvider";
import {
  MemoryUserVocabulary,
  type UserVocabulary,
} from "../personalization/UserVocabulary";
import { rankCandidates, type RankInput } from "../ranking/RankingEngine";
import { DEFAULT_WEIGHTS, PERSONAL_ONLY_FREQUENCY_PER_USE } from "../ranking/weights";
import { Trie } from "../trie/Trie";
import type {
  DictionaryEntry,
  PhraseEntry,
  RankingWeights,
  Suggestion,
  SuggestionRequest,
  SuggestionResult,
} from "../types";

export type PredictiveEngineOptions = {
  dictionary: readonly DictionaryEntry[] | DictionaryProvider;
  phrases?: readonly PhraseEntry[];
  maxSuggestions?: number;
  weights?: Partial<RankingWeights>;
  userVocabulary?: UserVocabulary;
  contextRanker?: ContextRanker;
  clock?: () => number;
};

type WordCandidate = {
  id: string;
  canonical: string;
  frequency: number;
  source: Suggestion["source"];
  prefixLength: number;
  candidateLength: number;
  replaceStart: number;
  replaceEnd: number;
  context: number;
};

/**
 * DOM-free prediction core. Construct it once and reuse it. A Web Worker can
 * host this class later and return the same `getSuggestions` payload.
 */
export class PredictiveEngine {
  private readonly dictionaryTrie = new Trie();
  private readonly personalTrie = new Trie();
  private readonly contextRanker: ContextRanker;
  private readonly vocabulary: UserVocabulary;
  private readonly weights: RankingWeights;
  private readonly maxSuggestions: number;
  private readonly clock: () => number;

  constructor(options: PredictiveEngineOptions) {
    const provider = isProvider(options.dictionary)
      ? options.dictionary
      : new LocalDictionaryProvider(options.dictionary);
    for (const entry of provider.getEntries()) {
      this.dictionaryTrie.insert(entry.word, entry.frequency);
    }

    const phraseEntries = options.phrases ?? [];
    this.contextRanker = options.contextRanker ?? new PhraseContextRanker(phraseEntries);
    this.vocabulary = options.userVocabulary ?? new MemoryUserVocabulary();
    this.weights = { ...DEFAULT_WEIGHTS, ...options.weights };
    this.maxSuggestions = options.maxSuggestions ?? 5;
    this.clock = options.clock ?? (() => Date.now());

    for (const entry of this.vocabulary.load()) {
      this.personalTrie.insert(entry.word, 0);
    }
  }

  getSuggestions(request: SuggestionRequest): SuggestionResult {
    const text = request.text ?? "";
    const cursorPosition = request.cursorPosition ?? text.length;
    const limit = request.limit ?? this.maxSuggestions;
    const cursor = tokenAtCursor(text, cursorPosition);
    const tokenRange = { start: cursor.start, end: cursor.end };
    const prefix = cursor.prefix;
    const editingWholeToken = prefix.length > 0 && prefix === cursor.word;
    const isCompleteWord =
      editingWholeToken &&
      (this.dictionaryTrie.has(prefix) || this.personalTrie.has(prefix));

    if (!prefix.trim() || limit <= 0) {
      return {
        currentWord: prefix,
        tokenRange,
        isCompleteWord,
        suggestions: [],
      };
    }

    const candidates = this.wordCandidates(cursor, editingWholeToken);
    const now = this.clock();
    const ranked = this.score(candidates, now);
    ranked.sort(
      (a, b) => b.score - a.score || b.frequency - a.frequency || a.canonical.localeCompare(b.canonical),
    );

    return {
      currentWord: prefix,
      tokenRange,
      isCompleteWord,
      suggestions: ranked.slice(0, limit).map((candidate) => ({
        text: applyTypingCase(prefix, candidate.canonical),
        canonical: candidate.canonical,
        score: candidate.score,
        source: candidate.source,
        replaceStart: candidate.replaceStart,
        replaceEnd: candidate.replaceEnd,
      })),
    };
  }

  /** Records a local acceptance. Nothing is sent off-device. */
  accept(canonical: string): void {
    const trimmed = canonical.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/u);
    const word = parts[parts.length - 1];
    if (!word) return;
    const record = this.vocabulary.record(word, this.clock());
    this.personalTrie.insert(record.word, 0);
  }

  private wordCandidates(
    cursor: ReturnType<typeof tokenAtCursor>,
    editingWholeToken: boolean,
  ): WordCandidate[] {
    const prefix = cursor.prefix;
    const prefixKey = prefix.toLowerCase();
    const merged = new Map<string, { canonical: string; frequency: number; personal: boolean }>();

    for (const match of this.dictionaryTrie.matchPrefix(prefix)) {
      merged.set(match.word.toLowerCase(), {
        canonical: match.word,
        frequency: match.frequency,
        personal: false,
      });
    }

    for (const match of this.personalTrie.matchPrefix(prefix)) {
      const key = match.word.toLowerCase();
      const existing = merged.get(key);
      if (!existing) {
        const usage = this.vocabulary.lookup(key);
        merged.set(key, {
          canonical: usage?.word ?? match.word,
          frequency: Math.max(1, usage?.usageCount ?? 1) * PERSONAL_ONLY_FREQUENCY_PER_USE,
          personal: true,
        });
      } else if ((this.vocabulary.lookup(key)?.usageCount ?? 0) > 0) {
        existing.personal = true;
      }
    }

    const candidates: WordCandidate[] = [];
    for (const [key, match] of merged) {
      if (editingWholeToken && key === prefixKey) continue;
      candidates.push({
        id: `word:${key}`,
        canonical: match.canonical,
        frequency: match.frequency,
        source: match.personal ? "personal" : "dictionary",
        prefixLength: [...prefix].length,
        candidateLength: [...match.canonical].length,
        replaceStart: cursor.start,
        replaceEnd: cursor.end,
        context: this.contextRanker.score(cursor.previousWords, match.canonical),
      });
    }
    return candidates;
  }

  private score(candidates: WordCandidate[], now: number): Array<WordCandidate & { score: number }> {
    const inputs: RankInput[] = candidates.map((candidate) => {
      const usage = this.vocabulary.lookup(candidate.canonical.split(/\s+/u).at(-1) ?? candidate.canonical);
      return {
        id: candidate.id,
        frequency: candidate.frequency,
        userCount: usage?.usageCount ?? 0,
        lastUsed: usage?.lastUsed ?? null,
        context: candidate.context,
        prefixLength: candidate.prefixLength,
        candidateLength: candidate.candidateLength,
      };
    });
    const scores = rankCandidates(inputs, this.weights, now);
    return candidates.map((candidate) => ({
      ...candidate,
      score: scores.get(candidate.id) ?? 0,
    }));
  }
}

function isProvider(
  value: readonly DictionaryEntry[] | DictionaryProvider,
): value is DictionaryProvider {
  return typeof (value as DictionaryProvider).getEntries === "function";
}
