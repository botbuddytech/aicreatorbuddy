import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";

export const YOUTUBE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

export const OAUTH_STATE_COOKIE = "yt_oauth_state";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function firstHeader(request: Request, name: string): string | null {
  return request.headers.get(name)?.split(",")[0]?.trim() || null;
}

/** Public origin of the request, honouring the proxy headers Railway sets. */
export function resolveOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = firstHeader(request, "x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = firstHeader(request, "x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/**
 * The redirect URI is derived from the incoming request instead of an env var so
 * that localhost and every deployment work without per-environment config. Both
 * /connect and /callback must produce the same value, and it has to be registered
 * in the Google Cloud OAuth client.
 */
export function redirectUriFor(request: Request): string {
  return `${resolveOrigin(request)}/api/youtube/callback`;
}

export function createOAuthClient(redirectUri?: string): OAuth2Client {
  return new google.auth.OAuth2({
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    ...(redirectUri ? { redirectUri } : {}),
  });
}

export function getAuthUrl(state: string, redirectUri: string): string {
  return createOAuthClient(redirectUri).generateAuthUrl({
    access_type: "offline",
    // select_account lets the user pick a different Gmail / brand channel each time;
    // consent forces Google to return a refresh token.
    prompt: "select_account consent",
    include_granted_scopes: true,
    scope: YOUTUBE_SCOPES,
    state,
  });
}

export type ExchangedTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  email: string | null;
};

export async function exchangeCode(code: string, redirectUri: string): Promise<ExchangedTokens> {
  const client = createOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error("Google did not return an access token");
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Remove the app from the Google account's third-party access and try again.",
    );
  }
  client.setCredentials(tokens);

  let email: string | null = null;
  try {
    const { data } = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
    email = data.email ?? null;
  } catch {
    // email is informational only
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600_000),
    scope: tokens.scope ?? YOUTUBE_SCOPES.join(" "),
    email,
  };
}

type ChannelTokenRow = {
  id: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date;
};

/**
 * Returns an authenticated client for a stored channel, refreshing and persisting
 * the access token when it is (about to be) expired. Marks the channel NEEDS_REAUTH
 * when Google rejects the refresh token.
 */
export async function getAuthedClientForChannel(channel: ChannelTokenRow): Promise<OAuth2Client> {
  const client = createOAuthClient();
  client.setCredentials({
    access_token: decrypt(channel.accessTokenEnc),
    refresh_token: decrypt(channel.refreshTokenEnc),
    expiry_date: channel.tokenExpiresAt.getTime(),
  });

  const expiresSoon = channel.tokenExpiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) return client;

  try {
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) throw new Error("No access token after refresh");
    client.setCredentials(credentials);
    await prisma.youtubeChannel.update({
      where: { id: channel.id },
      data: {
        accessTokenEnc: encrypt(credentials.access_token),
        tokenExpiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3600_000),
        ...(credentials.refresh_token ? { refreshTokenEnc: encrypt(credentials.refresh_token) } : {}),
        status: "ACTIVE",
      },
    });
    return client;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/invalid_grant|invalid_rapt|unauthorized/i.test(message)) {
      await prisma.youtubeChannel.update({
        where: { id: channel.id },
        data: { status: "NEEDS_REAUTH" },
      });
    }
    throw error;
  }
}

export async function revokeToken(refreshTokenEnc: string): Promise<void> {
  try {
    await createOAuthClient().revokeToken(decrypt(refreshTokenEnc));
  } catch {
    // Token may already be revoked/expired; deletion proceeds regardless.
  }
}
