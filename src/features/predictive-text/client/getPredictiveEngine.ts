"use client";

import dictionary from "../data/dictionary.json";
import phrases from "../data/phrases.json";
import { PredictiveEngine } from "../core/PredictiveEngine";
import { LocalStorageUserVocabulary } from "../personalization/UserVocabulary";
import type { DictionaryEntry, PhraseEntry } from "../types";

let engine: PredictiveEngine | null = null;

/** One in-memory trie for the page. Built on first use, never per keystroke. */
export function getPredictiveEngine(): PredictiveEngine {
  if (!engine) {
    engine = new PredictiveEngine({
      dictionary: dictionary as DictionaryEntry[],
      phrases: phrases as PhraseEntry[],
      userVocabulary: new LocalStorageUserVocabulary(),
    });
  }
  return engine;
}
