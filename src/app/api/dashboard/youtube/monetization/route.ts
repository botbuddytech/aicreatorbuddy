import { requireUser } from "@/lib/auth/session";
import { loadMonetization } from "@/lib/youtube/monetizationView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const payload = await loadMonetization(user, url.searchParams.get("range"), {
      refresh: url.searchParams.get("refresh") === "1",
    });
    return Response.json(payload, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load YouTube analytics.";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
  }
}
