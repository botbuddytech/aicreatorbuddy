import type { PhraseEntry } from "../types";
import type { ContextRanker } from "./ContextRanker";

/**
 * Bigram statistics collected from the local phrase list. The previous word
 * plus a candidate contributes its phrase frequency as a ranking signal.
 */
export class PhraseContextRanker implements ContextRanker {
  private readonly bigrams = new Map<string, number>();

  constructor(phrases: readonly PhraseEntry[]) {
    for (const phrase of phrases) {
      if (!phrase || typeof phrase.phrase !== "string") continue;
      const frequency = Number(phrase.frequency);
      if (!Number.isFinite(frequency) || frequency <= 0) continue;
      const tokens = phrase.phrase.trim().split(/\s+/u).filter(Boolean);
      for (let index = 1; index < tokens.length; index += 1) {
        const key = bigramKey(tokens[index - 1], tokens[index]);
        this.bigrams.set(key, (this.bigrams.get(key) ?? 0) + frequency);
      }
    }
  }

  score(previousWords: readonly string[], candidate: string): number {
    const previous = previousWords.at(-1);
    const next = candidate.trim().split(/\s+/u)[0];
    if (!previous || !next) return 0;
    return this.bigrams.get(bigramKey(previous, next)) ?? 0;
  }
}

function bigramKey(left: string, right: string): string {
  return `${left.toLowerCase()}\u0000${right.toLowerCase()}`;
}
