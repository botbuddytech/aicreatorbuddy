"use client";

import { useState } from "react";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { estimateGenerationCost } from "@/lib/apiCost";
import {
  mockGenerate,
  type GenerationInput,
  type GenerationOutput,
  type GenerationType,
} from "@/lib/mockAi";
import { newId, type AiProvider, type StepId } from "@/lib/videoProject";

export function useGeneration() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(key: string, task: () => Promise<T>): Promise<T | null> {
    setBusy(key);
    setError(null);
    try {
      return await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Try again.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  return { busy, error, run, setError };
}

export function usePipelineGeneration() {
  const { dispatch } = useVideoProject();
  const { busy, error, run, setError } = useGeneration();

  function recordCost<T extends GenerationType>(
    type: T,
    input: GenerationInput[T],
    provider: AiProvider,
    step: StepId,
  ) {
    dispatch({
      type: "RECORD_API_COST",
      entry: {
        id: newId(),
        at: new Date().toISOString(),
        step,
        provider: type.startsWith("vidiq") ? "vidiq" : provider,
        kind: type,
        usd: estimateGenerationCost(type, input, provider),
      },
    });
  }

  async function generate<T extends GenerationType>(
    key: string,
    type: T,
    input: GenerationInput[T],
    provider: AiProvider,
    step: StepId,
  ): Promise<GenerationOutput[T] | null> {
    const result = await run(key, () => mockGenerate(type, input, provider));
    if (result != null) recordCost(type, input, provider, step);
    return result;
  }

  return { busy, error, run, generate, recordCost, setError };
}
