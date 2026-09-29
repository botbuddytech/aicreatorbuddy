import type { DictionaryEntry } from "../types";

/**
 * Source of vocabulary entries. The prediction engine only sees the loaded
 * list, so a later SQLite, Postgres, or Supabase loader can replace the JSON
 * provider without changing the trie or ranker.
 */
export interface DictionaryProvider {
  getEntries(): readonly DictionaryEntry[];
}
