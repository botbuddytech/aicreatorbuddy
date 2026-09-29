import type { RankingWeights } from "../types";
import { RECENCY_HALF_LIFE_MS } from "./weights";

export type RankInput = {
  id: string;
  frequency: number;
  userCount: number;
  lastUsed: number | null;
  context: number;
  prefixLength: number;
  candidateLength: number;
};

/**
 * Scores are normalized on a fixed log scale against the strongest candidate
 * in the set. Min-max stretching is avoided so a tiny prefix-length gap cannot
 * drown out frequency.
 */
export function rankCandidates(
  inputs: readonly RankInput[],
  weights: RankingWeights,
  now: number,
): Map<string, number> {
  const scores = new Map<string, number>();
  if (inputs.length === 0) return scores;

  const frequencyReference = Math.max(...inputs.map((input) => input.frequency), 1);
  const userReference = Math.max(...inputs.map((input) => input.userCount), 1);
  const contextReference = Math.max(...inputs.map((input) => input.context), 1);
  const weightTotal =
    weights.prefixWeight +
    weights.frequencyWeight +
    weights.userWeight +
    weights.recencyWeight +
    weights.contextWeight;
  const divisor = weightTotal > 0 ? weightTotal : 1;

  for (const input of inputs) {
    const coverage =
      input.candidateLength > 0 ? input.prefixLength / input.candidateLength : 0;
    const prefixScore = 0.85 + 0.15 * Math.min(1, Math.max(0, coverage));
    const frequencyScore = logNorm(input.frequency, frequencyReference);
    const userScore = logNorm(input.userCount, userReference);
    const recencyScore = recency(input.lastUsed, now);
    const contextScore = logNorm(input.context, contextReference);
    const raw =
      weights.prefixWeight * prefixScore +
      weights.frequencyWeight * frequencyScore +
      weights.userWeight * userScore +
      weights.recencyWeight * recencyScore +
      weights.contextWeight * contextScore;
    scores.set(input.id, Math.round((raw / divisor) * 10000) / 10000);
  }

  return scores;
}

function logNorm(value: number, reference: number): number {
  if (value <= 0) return 0;
  const denom = Math.log(1 + Math.max(reference, 1));
  if (denom === 0) return 0;
  return Math.min(1, Math.log(1 + value) / denom);
}

function recency(lastUsed: number | null, now: number): number {
  if (!lastUsed) return 0;
  const age = Math.max(0, now - lastUsed);
  return Math.exp((-Math.LN2 * age) / RECENCY_HALF_LIFE_MS);
}
