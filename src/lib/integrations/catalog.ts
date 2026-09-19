import type {
  IntegrationAuthKind,
  IntegrationProvider,
} from "@/generated/prisma/enums";

export type IntegrationId =
  | "youtube"
  | "vidiq"
  | "chatgpt"
  | "gemini"
  | "elevenlabs"
  | "seedance"
  | "remotion";

export type IntegrationCatalogItem = {
  id: IntegrationId;
  provider: IntegrationProvider;
  authKind: IntegrationAuthKind;
  keyPrefix?: string;
  connectUrl?: string;
};

export const INTEGRATION_CATALOG: readonly IntegrationCatalogItem[] = [
  {
    id: "youtube",
    provider: "YOUTUBE",
    authKind: "OAUTH",
    connectUrl: "/api/youtube/connect",
  },
  {
    id: "vidiq",
    provider: "VIDIQ",
    authKind: "OAUTH",
    connectUrl: "/api/vidiq/connect",
  },
  { id: "chatgpt", provider: "CHATGPT", authKind: "API_KEY", keyPrefix: "sk-" },
  { id: "gemini", provider: "GEMINI", authKind: "API_KEY", keyPrefix: "AIza" },
  { id: "elevenlabs", provider: "ELEVENLABS", authKind: "API_KEY" },
  { id: "seedance", provider: "SEEDANCE", authKind: "API_KEY" },
  { id: "remotion", provider: "REMOTION", authKind: "NONE" },
] as const;

export function integrationCatalogItem(id: string): IntegrationCatalogItem | null {
  return INTEGRATION_CATALOG.find((item) => item.id === id) ?? null;
}
