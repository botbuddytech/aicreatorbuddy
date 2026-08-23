import type { GenerationInput, GenerationType } from "@/lib/mockAi";
import type { AiProvider } from "@/lib/videoProject";

const TEXT_USD_PER_1K_TOKENS: Record<string, number> = {
  chatgpt: 0.015,
  gemini: 0.008,
};

const VIDIQ_USD_PER_REQUEST = 0.008;
const THUMBNAIL_USD = 0.04;
const SCENE_VISUAL_USD = 0.08;

function roundUsd(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function llmUsd(provider: string, inputText: string, outputTokens: number): number {
  const rate = TEXT_USD_PER_1K_TOKENS[provider] ?? TEXT_USD_PER_1K_TOKENS.chatgpt;
  return ((estimateTokens(inputText) + outputTokens) / 1000) * rate;
}

export function estimateGenerationCost<T extends GenerationType>(
  type: T,
  input: GenerationInput[T],
  provider: AiProvider,
): number {
  switch (type) {
    case "titles": {
      const { prompt, count = 5 } = input as GenerationInput["titles"];
      return roundUsd(llmUsd(provider, prompt, 90 * Math.max(1, count)));
    }
    case "thumbnails": {
      const { count = 4 } = input as GenerationInput["thumbnails"];
      return roundUsd(Math.max(1, count) * THUMBNAIL_USD);
    }
    case "script": {
      const { prompt, durationSeconds } = input as GenerationInput["script"];
      const minutes = Math.max(durationSeconds / 60, 0.25);
      return roundUsd(llmUsd(provider, prompt, Math.round(minutes * 280)));
    }
    case "scenes": {
      const { fullScript, prompt } = input as GenerationInput["scenes"];
      return roundUsd(llmUsd(provider, `${prompt}\n${fullScript}`, 600));
    }
    case "sceneScript": {
      const { prompt } = input as GenerationInput["sceneScript"];
      return roundUsd(llmUsd(provider, prompt, 220));
    }
    case "sceneVisuals":
      return SCENE_VISUAL_USD;
    case "description": {
      const { prompt, title = "" } = input as GenerationInput["description"];
      return roundUsd(llmUsd(provider, `${prompt}\n${title}`, 350));
    }
    case "vidiqTitles": {
      const { titles } = input as GenerationInput["vidiqTitles"];
      return roundUsd(Math.max(1, titles.length) * VIDIQ_USD_PER_REQUEST);
    }
    case "vidiqThumbnails": {
      const { thumbnails } = input as GenerationInput["vidiqThumbnails"];
      return roundUsd(Math.max(1, thumbnails.length) * VIDIQ_USD_PER_REQUEST);
    }
    case "vidiqScript":
      return VIDIQ_USD_PER_REQUEST;
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function formatUsdEstimate(value: number): string {
  const safe = Math.max(0, value);
  if (safe === 0) return "$0.00";
  if (safe < 0.01) return `$${safe.toFixed(3)}`;
  const [whole, fraction = "00"] = safe.toFixed(2).split(".");
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}
