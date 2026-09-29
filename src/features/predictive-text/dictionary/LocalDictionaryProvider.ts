import type { DictionaryEntry } from "../types";
import type { DictionaryProvider } from "./DictionaryProvider";

/**
 * In-memory dictionary. Entries use this shape:
 * `{ "word": "education", "frequency": 92342, "language": "en", "category": "general" }`
 * `language`, `category`, and `metadata` are optional. Matching is case-insensitive;
 * `word` keeps the canonical spelling.
 */
export class LocalDictionaryProvider implements DictionaryProvider {
  private readonly entries: DictionaryEntry[];

  constructor(entries: readonly DictionaryEntry[]) {
    this.entries = sanitizeDictionary(entries);
  }

  getEntries(): readonly DictionaryEntry[] {
    return this.entries;
  }
}

export function sanitizeDictionary(entries: readonly DictionaryEntry[]): DictionaryEntry[] {
  const byWord = new Map<string, DictionaryEntry>();
  for (const entry of entries) {
    if (!entry || typeof entry.word !== "string") continue;
    const word = entry.word.trim();
    if (!word || /\s/u.test(word)) continue;
    const frequency = Number(entry.frequency);
    if (!Number.isFinite(frequency) || frequency < 0) continue;
    const key = word.toLowerCase();
    const existing = byWord.get(key);
    if (!existing || frequency >= existing.frequency) {
      byWord.set(key, {
        word,
        frequency,
        language: entry.language,
        category: entry.category,
        metadata: entry.metadata,
      });
    }
  }
  return [...byWord.values()];
}
