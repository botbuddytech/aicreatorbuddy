import { requireUser } from "@/lib/auth/session";
import { asAnalyticsRange } from "@/lib/youtube/analytics";
import { loadOverview } from "@/lib/youtube/present";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const payload = await loadOverview(user, asAnalyticsRange(url.searchParams.get("range")), {
      refresh: url.searchParams.get("refresh") === "1",
    });
    return Response.json(payload, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load YouTube data.";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
  }
}
