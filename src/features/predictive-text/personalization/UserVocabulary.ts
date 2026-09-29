export type UserVocabEntry = {
  word: string;
  usageCount: number;
  lastUsed: number;
};

export interface UserVocabulary {
  load(): UserVocabEntry[];
  record(word: string, now?: number): UserVocabEntry;
  lookup(word: string): UserVocabEntry | undefined;
}

const STORAGE_KEY = "predictive-text:user-vocab";
const MAX_ENTRIES = 2000;

export class MemoryUserVocabulary implements UserVocabulary {
  private readonly entries = new Map<string, UserVocabEntry>();

  constructor(initial: readonly UserVocabEntry[] = []) {
    for (const entry of initial) {
      const word = entry.word?.trim();
      if (!word || !Number.isFinite(entry.usageCount) || entry.usageCount <= 0) continue;
      this.entries.set(word.toLowerCase(), {
        word,
        usageCount: entry.usageCount,
        lastUsed: entry.lastUsed,
      });
    }
  }

  load(): UserVocabEntry[] {
    return [...this.entries.values()];
  }

  lookup(word: string): UserVocabEntry | undefined {
    return this.entries.get(word.trim().toLowerCase());
  }

  record(word: string, now = Date.now()): UserVocabEntry {
    const canonical = word.trim();
    const key = canonical.toLowerCase();
    const existing = this.entries.get(key);
    if (existing) {
      existing.usageCount += 1;
      existing.lastUsed = now;
      existing.word = canonical;
      return { ...existing };
    }
    const created = { word: canonical, usageCount: 1, lastUsed: now };
    this.entries.set(key, created);
    this.trim();
    return { ...created };
  }

  private trim(): void {
    if (this.entries.size <= MAX_ENTRIES) return;
    const ordered = [...this.entries.values()].sort((a, b) => a.lastUsed - b.lastUsed);
    const extra = this.entries.size - MAX_ENTRIES;
    for (let index = 0; index < extra; index += 1) {
      this.entries.delete(ordered[index].word.toLowerCase());
    }
  }
}

export class LocalStorageUserVocabulary extends MemoryUserVocabulary {
  private readonly storage: Storage | null;

  constructor(storage?: Storage | null) {
    const resolved = storage === undefined ? browserStorage() : storage;
    super(readStoredEntries(resolved));
    this.storage = resolved;
  }

  override record(word: string, now = Date.now()): UserVocabEntry {
    const entry = super.record(word, now);
    writeStoredEntries(this.storage, this.load());
    return entry;
  }
}

function readStoredEntries(storage: Storage | null): UserVocabEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredEntry);
  } catch {
    return [];
  }
}

function writeStoredEntries(storage: Storage | null, entries: UserVocabEntry[]): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore quota and privacy-mode failures. Predictions still work in memory.
  }
}

function browserStorage(): Storage | null {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

function isStoredEntry(value: unknown): value is UserVocabEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<UserVocabEntry>;
  return (
    typeof entry.word === "string" &&
    entry.word.trim().length > 0 &&
    typeof entry.usageCount === "number" &&
    Number.isFinite(entry.usageCount) &&
    entry.usageCount > 0 &&
    typeof entry.lastUsed === "number" &&
    Number.isFinite(entry.lastUsed)
  );
}
