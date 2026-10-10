import assert from "node:assert/strict";
import test from "node:test";
import type { UserIntegrationState } from "@/lib/integrations/repo";
import {
  defaultAiProvider,
  filterGenerators,
  llmIntegrationAvailability,
  pickFallbackGenerator,
} from "@/lib/integrations/llmAvailability";

function row(
  integrationId: "chatgpt" | "gemini",
  status: UserIntegrationState["status"],
  enabled: boolean,
): UserIntegrationState {
  return {
    id: integrationId,
    integrationId,
    provider: integrationId === "chatgpt" ? "CHATGPT" : "GEMINI",
    authKind: "API_KEY",
    connectUrl: null,
    keyPrefix: integrationId === "chatgpt" ? "sk-" : "AIza",
    sharedEnv: false,
    status,
    enabled,
    maskedCredential: null,
    accountLabel: null,
    plan: null,
    quotaUsed: null,
    quotaLimit: null,
    quotaUnit: null,
    quotaResetsAt: null,
    quotaNote: null,
    lastUsedAt: null,
    connectedAt: null,
    lastErrorMessage: null,
    usage: null,
  };
}

test("llmIntegrationAvailability requires connected and enabled", () => {
  assert.deepEqual(
    llmIntegrationAvailability([
      row("chatgpt", "CONNECTED", true),
      row("gemini", "CONNECTED", false),
    ]),
    { chatgpt: true, gemini: false },
  );
  assert.deepEqual(
    llmIntegrationAvailability([row("chatgpt", "NOT_CONNECTED", true)]),
    { chatgpt: false, gemini: false },
  );
});

test("filterGenerators drops unavailable LLMs", () => {
  const all = ["chatgpt", "gemini", "cursor", "vidiq"] as const;
  const filtered = filterGenerators(all, { chatgpt: false, gemini: true });
  assert.deepEqual(filtered, ["gemini", "cursor", "vidiq"]);
});

test("defaultAiProvider prefers chatgpt then gemini", () => {
  assert.equal(defaultAiProvider({ chatgpt: true, gemini: true }), "chatgpt");
  assert.equal(defaultAiProvider({ chatgpt: false, gemini: true }), "gemini");
  assert.equal(defaultAiProvider({ chatgpt: false, gemini: false }), "chatgpt");
});

test("pickFallbackGenerator prefers cursor", () => {
  assert.equal(pickFallbackGenerator(["vidiq", "cursor"], "cursor"), "cursor");
  assert.equal(pickFallbackGenerator(["vidiq"], "cursor"), "vidiq");
});
