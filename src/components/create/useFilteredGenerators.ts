"use client";

import { useEffect, useMemo } from "react";
import { useLlmIntegrationAvailability } from "@/components/create/VideoProjectProvider";
import {
  filterGenerators,
  pickFallbackGenerator,
} from "@/lib/integrations/llmAvailability";

export function useFilteredGenerators<T extends string>(
  all: readonly T[],
  current: T,
  setCurrent: (value: T) => void,
): readonly T[] {
  const llmAvailability = useLlmIntegrationAvailability();
  const providers = useMemo(
    () => filterGenerators(all, llmAvailability),
    [all, llmAvailability],
  );

  useEffect(() => {
    if (providers.length === 0) return;
    if (providers.includes(current)) return;
    setCurrent(pickFallbackGenerator(providers, "cursor" as T));
  }, [providers, current, setCurrent]);

  return providers;
}
