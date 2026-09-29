import type { PhraseEntry } from "../types";

export type PhraseMatch = {
  text: string;
  frequency: number;
  /** Previous tokens that belong to the phrase and should be replaced with it. */
  previousTokenCount: number;
  matchedToken: string;
};

type StoredPhrase = {
  text: string;
  tokens: string[];
  frequency: number;
};

export class PhrasePredictor {
  private readonly phrases: StoredPhrase[];

  constructor(entries: readonly PhraseEntry[] = []) {
    const byText = new Map<string, StoredPhrase>();
    for (const entry of entries) {
      if (!entry || typeof entry.phrase !== "string") continue;
      const text = entry.phrase.trim().replace(/\s+/gu, " ");
      const tokens = text.split(" ").filter(Boolean);
      const frequency = Number(entry.frequency);
      if (tokens.length < 2 || !Number.isFinite(frequency) || frequency <= 0) continue;
      const key = tokens.join(" ").toLowerCase();
      const existing = byText.get(key);
      if (!existing || frequency >= existing.frequency) {
        byText.set(key, { text, tokens: tokens.map((token) => token.toLowerCase()), frequency });
      }
    }
    this.phrases = [...byText.values()];
  }

  predict(previousWords: readonly string[], prefix: string, limit = 20): PhraseMatch[] {
    const prefixKey = prefix.trim().toLowerCase();
    if (!prefixKey || limit <= 0) return [];
    const previous = previousWords.map((word) => word.toLowerCase());
    const matches: PhraseMatch[] = [];
    const seen = new Set<string>();

    for (const phrase of this.phrases) {
      for (let index = phrase.tokens.length - 1; index >= 0; index -= 1) {
        const token = phrase.tokens[index];
        if (!token.startsWith(prefixKey)) continue;
        const needed = phrase.tokens.slice(0, index);
        if (!endsWith(previous, needed)) continue;
        const completesCurrent = token.length > prefixKey.length;
        const continuesAfter = index < phrase.tokens.length - 1;
        if (!completesCurrent && !continuesAfter) continue;
        if (seen.has(phrase.text.toLowerCase())) break;
        seen.add(phrase.text.toLowerCase());
        matches.push({
          text: phrase.text,
          frequency: phrase.frequency,
          previousTokenCount: needed.length,
          matchedToken: token,
        });
        break;
      }
    }

    matches.sort((a, b) => b.frequency - a.frequency || a.text.localeCompare(b.text));
    return matches.slice(0, limit);
  }
}

function endsWith(words: readonly string[], expected: readonly string[]): boolean {
  if (expected.length > words.length) return false;
  const start = words.length - expected.length;
  for (let index = 0; index < expected.length; index += 1) {
    if (words[start + index] !== expected[index]) return false;
  }
  return true;
}
