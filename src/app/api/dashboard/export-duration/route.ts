import { requireUser } from "@/lib/auth/session";
import { isExportDurationRange, isTimeZone } from "@/lib/dashboard/exportDuration";
import { exportDurationSummary } from "@/lib/dashboard/exportDurationQuery";

export const runtime = "nodejs";

const NO_STORE = { "cache-control": "no-store" };

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const rangeValue = url.searchParams.get("range") ?? "week";
    const timeZone = url.searchParams.get("timeZone") ?? "UTC";
    if (!isExportDurationRange(rangeValue)) {
      return Response.json({ error: "Choose today, this week, or this month." }, { status: 400, headers: NO_STORE });
    }
    if (!isTimeZone(timeZone)) {
      return Response.json({ error: "Unknown time zone." }, { status: 400, headers: NO_STORE });
    }
    const summary = await exportDurationSummary(user.id, rangeValue, timeZone);
    return Response.json(summary, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
    }
    const message = error instanceof Error ? error.message : "Could not load export duration.";
    return Response.json({ error: message }, { status: 502, headers: NO_STORE });
  }
}
