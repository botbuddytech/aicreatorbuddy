import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  createVidiqAuthorization,
  VIDIQ_OAUTH_COOKIE,
  VidiqAuthError,
} from "@/lib/vidiq/oauth";
import { resolveOrigin } from "@/lib/youtube/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectUriFor(request: Request): string {
  return `${resolveOrigin(request)}/api/vidiq/callback`;
}

export async function GET(request: Request) {
  const origin = resolveOrigin(request);
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  try {
    const authorization = await createVidiqAuthorization(
      user.id,
      redirectUriFor(request),
    );
    const payload = Buffer.from(
      JSON.stringify({
        state: authorization.state,
        verifier: authorization.codeVerifier,
        clientId: authorization.clientId,
      }),
      "utf8",
    ).toString("base64url");

    const store = await cookies();
    store.set(VIDIQ_OAUTH_COOKIE, payload, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
    return NextResponse.redirect(authorization.authorizationUrl);
  } catch (error) {
    const message =
      error instanceof VidiqAuthError
        ? error.message
        : "Could not start the vidIQ connection.";
    return NextResponse.redirect(
      `${origin}/dashboard/integrations?vidiqError=${encodeURIComponent(message)}`,
    );
  }
}
