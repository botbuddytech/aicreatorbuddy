import "server-only";

import { requireUser } from "@/lib/auth/session";

const NO_STORE = { "cache-control": "no-store" };

export function elevenLabsJson(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return false;
    }
  }
  // Same-origin GET fetches omit Origin. Browsers still send Sec-Fetch-Site.
  const site = request.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none" || site == null;
}

/** Returns a response when the caller cannot use ElevenLabs, otherwise null. */
export async function authorizeElevenLabs(request: Request): Promise<Response | null> {
  if (!isSameOrigin(request)) {
    return elevenLabsJson({ error: "Cross-origin requests are not allowed." }, 403);
  }
  try {
    await requireUser();
    return null;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return elevenLabsJson({ error: "Unauthorized." }, 401);
    }
    throw error;
  }
}
