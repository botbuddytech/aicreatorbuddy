import type { RankingWeights } from "../types";

export const DEFAULT_WEIGHTS: RankingWeights = {
  prefixWeight: 0.4,
  frequencyWeight: 0.3,
  userWeight: 0.2,
  recencyWeight: 0.1,
  contextWeight: 0.15,
};

/** Usage-derived frequency for words that exist only in local history. */
export const PERSONAL_ONLY_FREQUENCY_PER_USE = 4000;

export const RECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;
