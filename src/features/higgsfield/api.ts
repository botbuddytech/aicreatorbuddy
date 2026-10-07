import "server-only";

import { higgsfieldJobInput, higgsfieldModel, type HiggsfieldVideoModel } from "@/features/higgsfield/models";

const API_ORIGIN = "https://api.higgsfield.ai";

export type HiggsfieldCredentials = {
  keyId: string;
  secret: string;
};

export type HiggsfieldEstimate = {
  credits: string;
  usd: string;
};

export type HiggsfieldSubmission = {
  requestId: string;
  status: string;
};

export type HiggsfieldJobStatus = {
  status: string;
  videoUrl: string | null;
  error: string | null;
};

export function parseHiggsfieldCredentials(value: string): HiggsfieldCredentials {
  let raw = value.trim().replace(/^["']|["']$/g, "");
  raw = raw.replace(/^authorization:\s*/i, "").replace(/^key\s+/i, "");
  raw = raw.replace(/\s+/g, "");
  if (raw.length < 8 || raw.length > 2048) {
    throw new Error("Paste the Higgsfield API key.");
  }
  const colon = raw.indexOf(":");
  if (colon > 0 && colon < raw.length - 1) {
    return { keyId: raw.slice(0, colon), secret: raw.slice(colon + 1) };
  }
  return { keyId: raw, secret: "" };
}

function authorization(credentials: HiggsfieldCredentials): string {
  if (!credentials.secret) return `Key ${credentials.keyId}`;
  return `Key ${credentials.keyId}:${credentials.secret}`;
}

async function higgsfieldFetch(
  credentials: HiggsfieldCredentials,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", authorization(credentials));
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_ORIGIN}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export class HiggsfieldRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HiggsfieldRequestError";
    this.status = status;
  }
}

export function higgsfieldInsufficientCredits(error: unknown): boolean {
  return error instanceof HiggsfieldRequestError && error.status === 403;
}

function detailFrom(text: string): string {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown; message?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    return text.slice(0, 180);
  }
  return "";
}

async function readError(response: Response): Promise<never> {
  const text = await response.text().catch(() => "");
  const detail = detailFrom(text);
  if (response.status === 401) {
    throw new HiggsfieldRequestError(401, "The provider rejected this API key.");
  }
  if (response.status === 403) {
    throw new HiggsfieldRequestError(
      403,
      /credit/i.test(detail) ? detail : "This Higgsfield account does not have enough credits.",
    );
  }
  throw new HiggsfieldRequestError(
    response.status,
    detail || `Higgsfield request failed (${response.status}).`,
  );
}

export async function estimateHiggsfieldJob(
  credentials: HiggsfieldCredentials,
  input: {
    prompt: string;
    duration: number;
    aspectRatio: "16:9" | "9:16";
    model?: HiggsfieldVideoModel;
  },
): Promise<HiggsfieldEstimate> {
  const model = input.model ?? higgsfieldModel("kling-3-pro");
  const response = await higgsfieldFetch(credentials, `/estimate/${model.endpoint}`, {
    method: "POST",
    body: JSON.stringify(
      higgsfieldJobInput(model, {
        prompt: input.prompt,
        duration: input.duration,
        aspectRatio: input.aspectRatio,
      }),
    ),
  });
  if (!response.ok) await readError(response);
  const body = (await response.json()) as { credits?: unknown; usd?: unknown };
  const credits = typeof body.credits === "string" ? body.credits : String(body.credits ?? "");
  const usd = typeof body.usd === "string" ? body.usd : String(body.usd ?? "");
  if (!credits) throw new Error("Higgsfield did not return a credit estimate.");
  return { credits, usd };
}

export function estimateHiggsfieldClip(
  credentials: HiggsfieldCredentials,
): Promise<HiggsfieldEstimate> {
  return estimateHiggsfieldJob(credentials, {
    prompt: "A quiet cinematic shot.",
    duration: 5,
    aspectRatio: "16:9",
  });
}

export function higgsfieldEstimateLabel(estimate: HiggsfieldEstimate): {
  plan: string;
  accountLabel: string;
  message: string;
} {
  const usd = estimate.usd ? `$${estimate.usd}` : "the quoted USD amount";
  return {
    plan: `${estimate.credits} credits / 5s silent clip`,
    accountLabel: `About ${usd} for a 5 second silent clip. Remaining balance is in the Higgsfield Console.`,
    message: `Connection verified. A 5 second silent clip estimates ${estimate.credits} credits (${usd}). Remaining balance is in the Higgsfield Console.`,
  };
}

export async function submitHiggsfieldClip(
  credentials: HiggsfieldCredentials,
  input: {
    prompt: string;
    duration: number;
    aspectRatio: "16:9" | "9:16";
    idempotencyKey: string;
    model?: HiggsfieldVideoModel;
  },
): Promise<HiggsfieldSubmission> {
  const model = input.model ?? higgsfieldModel("kling-3-pro");
  const response = await higgsfieldFetch(credentials, `/${model.endpoint}`, {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify(
      higgsfieldJobInput(model, {
        prompt: input.prompt,
        duration: input.duration,
        aspectRatio: input.aspectRatio,
      }),
    ),
  });
  if (!response.ok) await readError(response);
  const body = (await response.json()) as { request_id?: unknown; status?: unknown };
  if (typeof body.request_id !== "string" || !body.request_id) {
    throw new Error("Higgsfield did not return a request id.");
  }
  return {
    requestId: body.request_id,
    status: typeof body.status === "string" ? body.status : "queued",
  };
}

const REQUEST_ID = /^[A-Za-z0-9-]{8,80}$/;

export function isHiggsfieldRequestId(value: string): boolean {
  return REQUEST_ID.test(value);
}

export async function readHiggsfieldStatus(
  credentials: HiggsfieldCredentials,
  requestId: string,
): Promise<HiggsfieldJobStatus> {
  if (!isHiggsfieldRequestId(requestId)) {
    throw new Error("That Higgsfield request id is not valid.");
  }
  const response = await higgsfieldFetch(credentials, `/requests/${requestId}/status`);
  if (!response.ok) await readError(response);
  const body = (await response.json()) as {
    status?: unknown;
    video?: { url?: unknown };
    error?: unknown;
    detail?: unknown;
  };
  const videoUrl =
    body.video && typeof body.video.url === "string" && body.video.url.startsWith("https://")
      ? body.video.url
      : null;
  const error =
    typeof body.error === "string"
      ? body.error
      : typeof body.detail === "string"
        ? body.detail
        : null;
  return {
    status: typeof body.status === "string" ? body.status : "unknown",
    videoUrl,
    error,
  };
}
