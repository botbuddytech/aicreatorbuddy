import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { callVidiqTool } from "@/lib/vidiq/client";
import { exchangeVidiqCode, VIDIQ_OAUTH_COOKIE } from "@/lib/vidiq/oauth";
import { resolveOrigin } from "@/lib/youtube/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectUriFor(request: Request): string {
  return `${resolveOrigin(request)}/api/vidiq/callback`;
}

function back(origin: string, params: Record<string, string>) {
  const url = new URL("/dashboard/integrations", origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const origin = resolveOrigin(request);
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const url = new URL(request.url);
  const store = await cookies();
  const rawCookie = store.get(VIDIQ_OAUTH_COOKIE)?.value;
  store.delete(VIDIQ_OAUTH_COOKIE);

  const oauthError = url.searchParams.get("error");
  if (oauthError) return back(origin, { vidiqError: `vidIQ authorization was cancelled (${oauthError}).` });

  let saved:
    | { state: string; verifier: string; clientId: string }
    | undefined;
  try {
    saved = rawCookie
      ? JSON.parse(Buffer.from(rawCookie, "base64url").toString("utf8"))
      : undefined;
  } catch {
    saved = undefined;
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (
    !code ||
    !state ||
    !saved?.state ||
    state !== saved.state ||
    !state.startsWith(`${user.id}.`) ||
    !saved.verifier ||
    !saved.clientId
  ) {
    return back(origin, { vidiqError: "Invalid vidIQ OAuth state. Please try again." });
  }

  try {
    const tokens = await exchangeVidiqCode({
      code,
      codeVerifier: saved.verifier,
      clientId: saved.clientId,
      redirectUri: redirectUriFor(request),
    });
    await prisma.userIntegration.upsert({
      where: { userId_provider: { userId: user.id, provider: "VIDIQ" } },
      create: {
        userId: user.id,
        provider: "VIDIQ",
        authKind: "OAUTH",
        status: "CONNECTED",
        enabled: true,
        accessTokenEnc: encrypt(tokens.accessToken),
        refreshTokenEnc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope,
        oauthClientId: saved.clientId,
        accountLabel: "Connected vidIQ account",
      },
      update: {
        status: "CONNECTED",
        enabled: true,
        accessTokenEnc: encrypt(tokens.accessToken),
        refreshTokenEnc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope,
        oauthClientId: saved.clientId,
        accountLabel: "Connected vidIQ account",
        lastErrorCode: null,
        lastErrorMessage: null,
        lastErrorAt: null,
      },
    });

    try {
      await callVidiqTool(user.id, "vidiq_balance", {}, { allowDisabled: true });
    } catch (error) {
      console.error("[vidiq] initial balance sync failed", error);
    }
    return back(origin, { vidiq: "connected" });
  } catch (error) {
    console.error("[vidiq] callback failed", error);
    const message =
      error instanceof Error ? error.message : "Could not connect your vidIQ account.";
    return back(origin, { vidiqError: message.slice(0, 300) });
  }
}
