import { stat } from "node:fs/promises";
import { qwenCacheWavPath } from "@/features/qwen/cacheFile";
import { readCachedRequest } from "@/features/qwen/contract";
import { authorizeQwen, qwenJson } from "@/features/qwen/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 64_000;

export async function POST(request: Request) {
  const denied = await authorizeQwen(request);
  if (denied) return denied;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return qwenJson({ error: "Request is too large." }, 413);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_REQUEST_BYTES) return qwenJson({ error: "Request is too large." }, 413);
    body = JSON.parse(raw);
  } catch {
    return qwenJson({ error: "Invalid request." }, 400);
  }

  const input = readCachedRequest(body);
  if ("error" in input) return qwenJson({ error: input.error }, 400);

  const ready: string[] = [];
  for (const line of input.lines) {
    try {
      const file = await stat(qwenCacheWavPath(input.voiceId, line.text));
      if (file.isFile() && file.size > 44) ready.push(line.id);
    } catch {
      /* not cached yet */
    }
  }
  return qwenJson({ ready });
}
