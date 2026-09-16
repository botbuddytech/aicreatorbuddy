import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { getSessionUser } from "@/lib/auth/session";
import { fetchMyChannel } from "@/lib/youtube/api";
import {
  OAUTH_STATE_COOKIE,
  createOAuthClient,
  exchangeCode,
  redirectUriFor,
  resolveOrigin,
} from "@/lib/youtube/oauth";
import { syncChannel } from "@/lib/youtube/sync";

export const dynamic = "force-dynamic";

function back(origin: string, params: Record<string, string>) {
  const url = new URL("/dashboard/channels", origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = resolveOrigin(request);

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return back(origin, { error: `Google sign-in was cancelled (${oauthError}).` });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (
    !code ||
    !state ||
    !expectedState ||
    state !== expectedState ||
    !state.startsWith(`${user.id}.`)
  ) {
    return back(origin, { error: "Invalid OAuth state. Please try connecting again." });
  }

  try {
    const tokens = await exchangeCode(code, redirectUriFor(request));

    const client = createOAuthClient();
    client.setCredentials({ access_token: tokens.accessToken });
    const channel = await fetchMyChannel(client);

    const saved = await prisma.youtubeChannel.upsert({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId: channel.channelId,
        },
      },
      create: {
        userId: user.id,
        channelId: channel.channelId,
        title: channel.title,
        customUrl: channel.customUrl,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        hiddenSubscriberCount: channel.hiddenSubscriberCount,
        viewCount: channel.viewCount,
        videoCount: channel.videoCount,
        uploadsPlaylistId: channel.uploadsPlaylistId,
        googleEmail: tokens.email,
        scope: tokens.scope,
        accessTokenEnc: encrypt(tokens.accessToken),
        refreshTokenEnc: encrypt(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
        status: "ACTIVE",
      },
      update: {
        title: channel.title,
        customUrl: channel.customUrl,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        hiddenSubscriberCount: channel.hiddenSubscriberCount,
        viewCount: channel.viewCount,
        videoCount: channel.videoCount,
        uploadsPlaylistId: channel.uploadsPlaylistId,
        googleEmail: tokens.email,
        scope: tokens.scope,
        accessTokenEnc: encrypt(tokens.accessToken),
        refreshTokenEnc: encrypt(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    try {
      await syncChannel({ channelDbId: saved.id, user });
    } catch (error) {
      console.error("[youtube] initial sync failed", error);
      return back(origin, {
        connected: saved.id,
        error: "Channel connected, but the first video sync failed. Use Sync to retry.",
      });
    }

    return back(origin, { connected: saved.id });
  } catch (error) {
    console.error("[youtube] callback failed", error);
    const message = error instanceof Error ? error.message : "Could not connect channel.";
    return back(origin, { error: message.slice(0, 300) });
  }
}
