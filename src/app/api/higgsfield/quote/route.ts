import { requireUser } from "@/lib/auth/session";
import { quoteHiggsfieldAccounts } from "@/features/higgsfield/accounts";

export const runtime = "nodejs";

const NO_STORE = { "cache-control": "no-store" };

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin requests are not allowed." }, 403);
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as {
      prompt?: unknown;
      durationSeconds?: unknown;
      aspectRatio?: unknown;
      modelId?: unknown;
    } | null;
    const prompt = typeof body?.prompt === "string" ? body.prompt : "";
    const durationSeconds = typeof body?.durationSeconds === "number" ? body.durationSeconds : 5;
    const aspectRatio = typeof body?.aspectRatio === "string" ? body.aspectRatio : "16:9";
    const modelId = typeof body?.modelId === "string" ? body.modelId : "kling-3-pro";
    const quoted = await quoteHiggsfieldAccounts(user.id, {
      prompt,
      durationSeconds,
      aspectRatio,
      modelId,
    });
    return json({
      accounts: quoted.accounts,
      note: quoted.note,
      durationSeconds: quoted.durationSeconds,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return json({ error: "Unauthorized." }, 401);
    }
    const message = error instanceof Error ? error.message : "Could not load Higgsfield accounts.";
    return json({ error: message }, 502);
  }
}
