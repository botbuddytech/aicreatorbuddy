import { requireUser } from "@/lib/auth/session";
import { takeUploadTransfer } from "@/lib/youtube/uploadTransfer";

export const runtime = "nodejs";

const NO_STORE = { "cache-control": "no-store" };

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
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
    const transferId = new URL(request.url).searchParams.get("transferId")?.trim() ?? "";
    if (!transferId) return json({ error: "Missing transfer id." }, 400);

    const transfer = takeUploadTransfer(transferId, user.id);
    if (!transfer) return json({ error: "Upload session expired. Try again." }, 410);

    const contentType =
      request.headers.get("content-type")?.split(";")[0]?.trim() || transfer.contentType || "video/mp4";
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength < 1) return json({ error: "Video file is empty." }, 400);

    const uploaded = await fetch(transfer.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
      },
      body: Buffer.from(bytes),
    });

    const text = await uploaded.text();
    let body: { id?: string; error?: { message?: string } } | null = null;
    try {
      body = text ? (JSON.parse(text) as { id?: string; error?: { message?: string } }) : null;
    } catch {
      body = null;
    }

    if (!uploaded.ok || !body?.id) {
      const detail = body?.error?.message || text.slice(0, 300) || `YouTube rejected the upload (${uploaded.status}).`;
      return json({ error: detail }, 502);
    }

    return json({ videoId: body.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the video to YouTube.";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return json({ error: message.slice(0, 300) }, status);
  }
}
