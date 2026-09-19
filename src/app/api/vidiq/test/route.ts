import { requireUser } from "@/lib/auth/session";
import { callVidiqTool, VidiqError } from "@/lib/vidiq/client";

export const runtime = "nodejs";

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
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  try {
    const user = await requireUser();
    const balance = await callVidiqTool<Record<string, unknown>>(
      user.id,
      "vidiq_balance",
      {},
      { allowDisabled: true },
    );
    return Response.json(
      { ok: true, balance },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (error instanceof VidiqError) {
      return Response.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return Response.json({ error: "Could not reach vidIQ." }, { status: 500 });
  }
}
