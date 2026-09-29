/**
 * Local context signal. A later on-device model can implement this without
 * changing the trie or the suggestion UI.
 */
export interface ContextRanker {
  score(previousWords: readonly string[], candidate: string): number;
}

export class NullContextRanker implements ContextRanker {
  score(): number {
    return 0;
  }
}
