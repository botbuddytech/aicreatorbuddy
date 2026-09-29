export type TrieMatch = {
  word: string;
  frequency: number;
};

class TrieNode {
  children = new Map<string, TrieNode>();
  terminal: TrieMatch | null = null;
}

/**
 * Character trie keyed by the lowercased word. Prefix lookup walks the
 * prefix, then collects terminal descendants. It does not scan a word list.
 */
export class Trie {
  private root = new TrieNode();

  insert(word: string, frequency = 0): void {
    const canonical = word.trim();
    if (!canonical) return;
    const key = canonical.toLowerCase();
    let node = this.root;
    for (const char of key) {
      let child = node.children.get(char);
      if (!child) {
        child = new TrieNode();
        node.children.set(char, child);
      }
      node = child;
    }
    const nextFrequency = node.terminal
      ? Math.max(node.terminal.frequency, frequency)
      : frequency;
    const nextWord =
      node.terminal && node.terminal.frequency > frequency ? node.terminal.word : canonical;
    node.terminal = { word: nextWord, frequency: nextFrequency };
  }

  remove(word: string): boolean {
    const key = word.trim().toLowerCase();
    if (!key) return false;
    const stack: TrieNode[] = [this.root];
    const chars: string[] = [];
    let node = this.root;
    for (const char of key) {
      const child = node.children.get(char);
      if (!child) return false;
      chars.push(char);
      stack.push(child);
      node = child;
    }
    if (!node.terminal) return false;
    node.terminal = null;
    for (let index = stack.length - 1; index > 0; index -= 1) {
      const current = stack[index];
      if (current.terminal || current.children.size > 0) break;
      stack[index - 1].children.delete(chars[index - 1]);
    }
    return true;
  }

  has(word: string): boolean {
    const node = this.walk(word.trim().toLowerCase());
    return Boolean(node?.terminal);
  }

  search(prefix: string): string[] {
    return this.matchPrefix(prefix).map((match) => match.word);
  }

  /** All dictionary hits for a prefix. Ranking is applied by the engine, not here. */
  matchPrefix(prefix: string): TrieMatch[] {
    const node = this.walk(prefix.trim().toLowerCase());
    if (!node) return [];
    const matches: TrieMatch[] = [];
    this.collect(node, matches);
    return matches;
  }

  getSuggestions(prefix: string, limit: number): TrieMatch[] {
    if (limit <= 0) return [];
    return this.matchPrefix(prefix).slice(0, limit);
  }

  private walk(key: string): TrieNode | null {
    let node = this.root;
    for (const char of key) {
      const child = node.children.get(char);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  private collect(node: TrieNode, matches: TrieMatch[]): void {
    if (node.terminal) matches.push(node.terminal);
    for (const child of node.children.values()) {
      this.collect(child, matches);
    }
  }
}
