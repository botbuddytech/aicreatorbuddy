import { requireUser } from "@/lib/auth/session";
import { QWEN_DOWN_MESSAGE } from "@/features/qwen/contract";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

export function qwenJson(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

export function qwenBaseUrl() {
  const raw = process.env.QWEN_URL?.trim() || "http://127.0.0.1:8765";
  return raw.replace(/\/$/, "");
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function originsMatch(left: string, right: string) {
  try {
    const a = new URL(left);
    const b = new URL(right);
    if (a.origin === b.origin) return true;
    return (
      a.protocol === b.protocol &&
      a.port === b.port &&
      isLocalHost(a.hostname) &&
      isLocalHost(b.hostname)
    );
  } catch {
    return false;
  }
}

function browserOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(/:$/, "");
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "none") return true;
  const origin = request.headers.get("origin");
  if (!origin) return site == null;
  return originsMatch(origin, browserOrigin(request)) || originsMatch(origin, new URL(request.url).origin);
}

export async function authorizeQwen(request: Request): Promise<Response | null> {
  if (process.env.NODE_ENV !== "development") {
    return qwenJson({ error: "Not found." }, 404);
  }
  if (!isSameOrigin(request)) {
    return qwenJson({ error: "Cross-origin requests are not allowed." }, 403);
  }
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return qwenJson({ error: "Unauthorized." }, 401);
    }
    throw error;
  }
  return null;
}

export class QwenUpstreamError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function qwenFetch(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  init.signal?.addEventListener("abort", onAbort);
  try {
    return await fetch(`${qwenBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    if (timedOut) {
      throw new QwenUpstreamError("Qwen took too long to respond.", 504);
    }
    console.error("[qwen] voice server unreachable", error);
    throw new QwenUpstreamError(QWEN_DOWN_MESSAGE, 503);
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", onAbort);
  }
}

export async function upstreamErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    /* not json */
  }
  return fallback;
}
