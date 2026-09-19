import "server-only";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CreateStep } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  getVidiqAccessToken,
  VIDIQ_MCP_URL,
  VidiqAuthError,
} from "@/lib/vidiq/oauth";

const TOOL_CREDITS: Record<string, number> = {
  vidiq_balance: 0,
  vidiq_score_title: 5,
  vidiq_generate_titles: 5,
};

export class VidiqError extends Error {
  constructor(
    public readonly code:
      | "not-connected"
      | "disabled"
      | "needs-reauth"
      | "out-of-credits"
      | "tool-failed",
    message: string,
  ) {
    super(message);
    this.name = "VidiqError";
  }
}

export type VidiqCallContext = {
  sessionId?: string;
  step?: CreateStep;
  channelId?: string;
  allowDisabled?: boolean;
};

function parseToolResult(result: {
  structuredContent?: Record<string, unknown>;
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
  toolResult?: unknown;
}): unknown {
  if ("toolResult" in result && result.toolResult !== undefined) return result.toolResult;
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

function mapError(error: unknown): VidiqError {
  if (error instanceof VidiqError) return error;
  if (error instanceof VidiqAuthError) {
    return new VidiqError(error.code === "oauth-failed" ? "tool-failed" : error.code, error.message);
  }
  const message = error instanceof Error ? error.message : "vidIQ request failed.";
  if (/credit|quota|balance|insufficient/i.test(message)) {
    return new VidiqError("out-of-credits", "Your vidIQ account does not have enough credits.");
  }
  if (/401|unauthori[sz]ed|invalid.?token/i.test(message)) {
    return new VidiqError("needs-reauth", "Reconnect your vidIQ account.");
  }
  return new VidiqError("tool-failed", message.slice(0, 300));
}

export async function callVidiqTool<T>(
  userId: string,
  tool: string,
  args: Record<string, unknown>,
  context: VidiqCallContext = {},
): Promise<T> {
  const startedAt = Date.now();
  let integrationId: string | null = null;
  let transport: StreamableHTTPClientTransport | null = null;
  let ok = false;
  let errorCode: string | null = null;

  try {
    const auth = await getVidiqAccessToken(userId, {
      allowDisabled: context.allowDisabled,
    });
    integrationId = auth.integrationId;
    transport = new StreamableHTTPClientTransport(new URL(VIDIQ_MCP_URL), {
      requestInit: {
        headers: { authorization: `Bearer ${auth.accessToken}` },
      },
    });
    const client = new Client(
      { name: "ai-creator-buddy", version: "1.0.0" },
      { capabilities: {} },
    );
    await client.connect(transport);
    const result = await client.callTool({ name: tool, arguments: args });
    if ("isError" in result && result.isError) {
      const parsed = parseToolResult(result);
      throw new Error(
        typeof parsed === "object" && parsed && "text" in parsed
          ? String(parsed.text)
          : `${tool} failed.`,
      );
    }
    ok = true;
    const parsed = parseToolResult(result);

    if (tool === "vidiq_balance" && parsed && typeof parsed === "object") {
      const balance = parsed as Record<string, unknown>;
      await prisma.userIntegration.update({
        where: { id: integrationId },
        data: {
          plan: typeof balance.type === "string" ? balance.type : null,
          quotaUsed:
            typeof balance.totalCredits === "number"
              ? balance.totalCredits
              : null,
          quotaLimit:
            typeof balance.maxRenewableCredits === "number"
              ? balance.maxRenewableCredits +
                (typeof balance.maxAddOnCredits === "number"
                  ? balance.maxAddOnCredits
                  : 0)
              : null,
          quotaUnit: "credits remaining",
          quotaResetsAt:
            typeof balance.renewableResetsAt === "string"
              ? new Date(balance.renewableResetsAt)
              : null,
          quotaSyncedAt: new Date(),
          lastUsedAt: new Date(),
          status: "CONNECTED",
          lastErrorCode: null,
          lastErrorMessage: null,
          lastErrorAt: null,
        },
      });
    } else {
      await prisma.userIntegration.update({
        where: { id: integrationId },
        data: { lastUsedAt: new Date() },
      });
    }

    return parsed as T;
  } catch (cause) {
    const error = mapError(cause);
    errorCode = error.code;
    if (integrationId) {
      await prisma.userIntegration.update({
        where: { id: integrationId },
        data: {
          ...(error.code === "needs-reauth"
            ? { status: "NEEDS_REAUTH" as const, enabled: false }
            : {}),
          lastErrorCode: error.code,
          lastErrorMessage: error.message,
          lastErrorAt: new Date(),
        },
      }).catch(() => undefined);
    }
    throw error;
  } finally {
    await transport?.close().catch(() => undefined);
    if (integrationId) {
      await prisma.integrationUsage.create({
        data: {
          userIntegrationId: integrationId,
          userId,
          provider: "VIDIQ",
          operation: tool,
          method: "MCP",
          ok,
          latencyMs: Date.now() - startedAt,
          units: ok ? (TOOL_CREDITS[tool] ?? 0) : 0,
          sessionId: context.sessionId,
          step: context.step,
          channelId: context.channelId,
          httpStatus: errorCode === "needs-reauth" ? 401 : null,
        },
      }).catch(() => undefined);
    }
  }
}
