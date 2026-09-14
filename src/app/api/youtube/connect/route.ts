import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isDemoAuthed } from "@/lib/demoAuth.server";
import {
  OAUTH_STATE_COOKIE,
  getAuthUrl,
  redirectUriFor,
  resolveOrigin,
} from "@/lib/youtube/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = resolveOrigin(request);

  if (!(await isDemoAuthed())) {
    return NextResponse.redirect(`${origin}/login`);
  }

  let authUrl: string;
  const state = randomBytes(24).toString("base64url");
  try {
    authUrl = getAuthUrl(state, redirectUriFor(request));
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth is not configured";
    return NextResponse.redirect(
      `${origin}/dashboard/channels?error=${encodeURIComponent(message)}`,
    );
  }

  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(authUrl);
}
