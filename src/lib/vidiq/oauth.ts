import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";

export const VIDIQ_MCP_URL = "https://mcp.vidiq.com/mcp";
export const VIDIQ_OAUTH_COOKIE = "vidiq_oauth";
const VIDIQ_AUTHORIZE_URL = `${VIDIQ_MCP_URL}/authorize`;
const VIDIQ_TOKEN_URL = `${VIDIQ_MCP_URL}/token`;
const VIDIQ_REGISTER_URL = `${VIDIQ_MCP_URL}/register`;

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export type VidiqTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string;
};

export class VidiqAuthError extends Error {
  constructor(
    public readonly code:
      | "not-connected"
      | "disabled"
      | "needs-reauth"
      | "oauth-failed",
    message: string,
  ) {
    super(message);
    this.name = "VidiqAuthError";
  }
}

function parseTokens(payload: TokenResponse, previousRefreshToken?: string): VidiqTokens {
  if (!payload.access_token) {
    throw new VidiqAuthError(
      "oauth-failed",
      payload.error_description || payload.error || "vidIQ did not return an access token.",
    );
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? previousRefreshToken ?? null,
    expiresAt:
      typeof payload.expires_in === "number"
        ? new Date(Date.now() + payload.expires_in * 1000)
        : null,
    scope: payload.scope ?? "api",
  };
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(VIDIQ_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok) {
    throw new VidiqAuthError(
      /invalid_grant/i.test(payload.error ?? "") ? "needs-reauth" : "oauth-failed",
      payload.error_description || payload.error || `vidIQ OAuth failed (${response.status}).`,
    );
  }
  return payload;
}

export async function ensureVidiqClientRegistration(
  redirectUri: string,
): Promise<string> {
  const existing = await prisma.mcpClientRegistration.findUnique({
    where: {
      server_redirectUri: { server: VIDIQ_MCP_URL, redirectUri },
    },
    select: { clientId: true },
  });
  if (existing) return existing.clientId;

  const response = await fetch(VIDIQ_REGISTER_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_name: "AI Creator Buddy",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "api",
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    client_id?: string;
    client_secret?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.client_id) {
    throw new VidiqAuthError(
      "oauth-failed",
      payload.error_description || payload.error || "Could not register with vidIQ.",
    );
  }

  const saved = await prisma.mcpClientRegistration.upsert({
    where: {
      server_redirectUri: { server: VIDIQ_MCP_URL, redirectUri },
    },
    create: {
      server: VIDIQ_MCP_URL,
      redirectUri,
      clientId: payload.client_id,
      clientSecret: payload.client_secret ?? null,
    },
    update: {
      clientId: payload.client_id,
      clientSecret: payload.client_secret ?? null,
    },
    select: { clientId: true },
  });
  return saved.clientId;
}

export async function createVidiqAuthorization(
  userId: string,
  redirectUri: string,
): Promise<{ authorizationUrl: string; state: string; codeVerifier: string; clientId: string }> {
  const clientId = await ensureVidiqClientRegistration(redirectUri);
  const state = `${userId}.${randomBytes(24).toString("base64url")}`;
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const url = new URL(VIDIQ_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "api");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("resource", VIDIQ_MCP_URL);
  return { authorizationUrl: url.toString(), state, codeVerifier, clientId };
}

export async function exchangeVidiqCode(input: {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}): Promise<VidiqTokens> {
  const payload = await postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      code_verifier: input.codeVerifier,
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      resource: VIDIQ_MCP_URL,
    }),
  );
  return parseTokens(payload);
}

async function refreshVidiqTokens(
  clientId: string,
  refreshToken: string,
): Promise<VidiqTokens> {
  const payload = await postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      scope: "api",
      resource: VIDIQ_MCP_URL,
    }),
  );
  return parseTokens(payload, refreshToken);
}

export async function getVidiqAccessToken(
  userId: string,
  options: { allowDisabled?: boolean } = {},
): Promise<{ integrationId: string; accessToken: string }> {
  const connection = await prisma.userIntegration.findUnique({
    where: { userId_provider: { userId, provider: "VIDIQ" } },
  });
  if (!connection?.accessTokenEnc) {
    throw new VidiqAuthError("not-connected", "Connect your vidIQ account first.");
  }
  if (!connection.enabled && !options.allowDisabled) {
    throw new VidiqAuthError("disabled", "Enable the vidIQ integration first.");
  }
  if (connection.status === "NEEDS_REAUTH" || connection.status === "REVOKED") {
    throw new VidiqAuthError("needs-reauth", "Reconnect your vidIQ account.");
  }

  const expiresSoon =
    connection.tokenExpiresAt != null &&
    connection.tokenExpiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) {
    return {
      integrationId: connection.id,
      accessToken: decrypt(connection.accessTokenEnc),
    };
  }
  if (!connection.refreshTokenEnc || !connection.oauthClientId) {
    await prisma.userIntegration.update({
      where: { id: connection.id },
      data: { status: "NEEDS_REAUTH", enabled: false },
    });
    throw new VidiqAuthError("needs-reauth", "Reconnect your vidIQ account.");
  }

  try {
    const tokens = await refreshVidiqTokens(
      connection.oauthClientId,
      decrypt(connection.refreshTokenEnc),
    );
    await prisma.userIntegration.update({
      where: { id: connection.id },
      data: {
        accessTokenEnc: encrypt(tokens.accessToken),
        refreshTokenEnc: tokens.refreshToken
          ? encrypt(tokens.refreshToken)
          : connection.refreshTokenEnc,
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope,
        status: "CONNECTED",
      },
    });
    return { integrationId: connection.id, accessToken: tokens.accessToken };
  } catch (error) {
    if (error instanceof VidiqAuthError && error.code === "needs-reauth") {
      await prisma.userIntegration.update({
        where: { id: connection.id },
        data: {
          status: "NEEDS_REAUTH",
          enabled: false,
          lastErrorCode: error.code,
          lastErrorMessage: error.message,
          lastErrorAt: new Date(),
        },
      });
    }
    throw error;
  }
}
