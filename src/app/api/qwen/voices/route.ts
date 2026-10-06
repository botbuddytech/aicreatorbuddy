import { parseVoiceList } from "@/features/qwen/contract";
import {
  authorizeQwen,
  qwenFetch,
  qwenJson,
  QwenUpstreamError,
  upstreamErrorMessage,
} from "@/features/qwen/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await authorizeQwen(request);
  if (denied) return denied;

  try {
    const upstream = await qwenFetch("/voices", { method: "GET", signal: request.signal }, 5_000);
    if (!upstream.ok) {
      const message = await upstreamErrorMessage(upstream, "Could not load Qwen voices.");
      return qwenJson({ error: message }, upstream.status);
    }
    const voices = parseVoiceList(await upstream.json());
    if (!voices) return qwenJson({ error: "Could not load Qwen voices." }, 502);
    return qwenJson({ voices });
  } catch (error) {
    if (request.signal.aborted) return qwenJson({ error: "Cancelled." }, 499);
    if (error instanceof QwenUpstreamError) {
      return qwenJson({ error: error.message }, error.status);
    }
    console.error("[qwen] voice list failed", error);
    return qwenJson({ error: "Could not load Qwen voices." }, 500);
  }
}
