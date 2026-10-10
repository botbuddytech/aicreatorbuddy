import type { UserIntegrationState } from "@/lib/integrations/repo";
import type { AiProvider } from "@/lib/videoProject";

export type LlmIntegrationAvailability = {
  chatgpt: boolean;
  gemini: boolean;
};

export const EMPTY_LLM_AVAILABILITY: LlmIntegrationAvailability = {
  chatgpt: false,
  gemini: false,
};

function isUsableLlm(row: UserIntegrationState | undefined): boolean {
  return row?.status === "CONNECTED" && row.enabled === true;
}

export function llmIntegrationAvailability(
  integrations: UserIntegrationState[],
): LlmIntegrationAvailability {
  const chatgpt = integrations.find((row) => row.integrationId === "chatgpt");
  const gemini = integrations.find((row) => row.integrationId === "gemini");
  return {
    chatgpt: isUsableLlm(chatgpt),
    gemini: isUsableLlm(gemini),
  };
}

export function filterGenerators<T extends string>(
  generators: readonly T[],
  avail: LlmIntegrationAvailability,
): T[] {
  return generators.filter((id) => {
    if (id === "chatgpt") return avail.chatgpt;
    if (id === "gemini") return avail.gemini;
    return true;
  });
}

/** First enabled LLM provider for description-style steps; falls back to chatgpt if none. */
export function defaultAiProvider(avail: LlmIntegrationAvailability): AiProvider {
  if (avail.chatgpt) return "chatgpt";
  if (avail.gemini) return "gemini";
  return "chatgpt";
}

export function pickFallbackGenerator<T extends string>(
  providers: readonly T[],
  prefer: T = "cursor" as T,
): T {
  if (providers.includes(prefer)) return prefer;
  return providers[0] ?? prefer;
}
