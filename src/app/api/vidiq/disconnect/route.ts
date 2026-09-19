import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

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
    await prisma.userIntegration.updateMany({
      where: { userId: user.id, provider: "VIDIQ" },
      data: {
        status: "REVOKED",
        enabled: false,
        accessTokenEnc: null,
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        scope: null,
        accountLabel: null,
        plan: null,
        quotaUsed: null,
        quotaLimit: null,
        quotaUnit: null,
        quotaResetsAt: null,
      },
    });
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    return Response.json({ error: "Could not disconnect vidIQ." }, { status: 500 });
  }
}
