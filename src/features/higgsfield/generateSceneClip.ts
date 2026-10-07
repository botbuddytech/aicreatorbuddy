import { higgsfieldAspect } from "@/features/higgsfield/duration";

export type HiggsfieldStoredClip = {
  url: string;
  storagePath: string;
  clipId: string;
  durationSeconds: number;
};

export type HiggsfieldGenerateInput = {
  sessionId: string;
  sceneId: string;
  accountId: string;
  modelId: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio: string;
  previousStoragePath: string | null;
  onStarted?: () => void;
};

type StartResponse = {
  requestId?: string;
  durationSeconds?: number;
  note?: string | null;
  error?: string;
  insufficientCredits?: boolean;
};

type CollectResponse = {
  status?: string;
  clip?: HiggsfieldStoredClip;
  error?: string;
};

const POLL_MS = 4000;
const MAX_POLLS = 90;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function postHiggsfield(
  sessionId: string,
  sceneId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(
    `/api/create/sessions/${encodeURIComponent(sessionId)}/scenes/${encodeURIComponent(sceneId)}/higgsfield`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function generateHiggsfieldSceneClip(
  input: HiggsfieldGenerateInput,
): Promise<HiggsfieldStoredClip & { note: string | null }> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Generate a prompt for this scene before creating a clip.");

  const started = await postHiggsfield(input.sessionId, input.sceneId, {
    action: "start",
    accountId: input.accountId,
    modelId: input.modelId,
    prompt,
    durationSeconds: input.durationSeconds,
    aspectRatio: higgsfieldAspect(input.aspectRatio),
  });
  const startBody = (await started.json().catch(() => null)) as StartResponse | null;
  if (!started.ok || !startBody?.requestId) {
    throw new Error(startBody?.error || "Could not start Higgsfield generation.");
  }
  input.onStarted?.();

  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    await sleep(attempt === 0 ? 1500 : POLL_MS);
    const collected = await postHiggsfield(input.sessionId, input.sceneId, {
      action: "collect",
      accountId: input.accountId,
      requestId: startBody.requestId,
      modelId: input.modelId,
      previousStoragePath: input.previousStoragePath,
    });
    const body = (await collected.json().catch(() => null)) as CollectResponse | null;
    if (!collected.ok) {
      throw new Error(body?.error || "Higgsfield generation failed.");
    }
    if (body?.clip) {
      return {
        ...body.clip,
        durationSeconds: startBody.durationSeconds ?? body.clip.durationSeconds,
        note: startBody.note ?? null,
      };
    }
  }

  throw new Error("Higgsfield is still rendering. Try this scene again in a minute.");
}
