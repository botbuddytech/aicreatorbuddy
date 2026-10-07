import { AsyncLocalStorage } from "node:async_hooks";
import { prisma } from "@/lib/db";

type UsageContext = {
  userId: string;
  integrationId: string | null;
  channelId?: string;
  sessionId?: string;
};

const storage = new AsyncLocalStorage<UsageContext>();

export async function runWithYoutubeUsage<T>(
  input: { userId: string; channelId?: string; sessionId?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const integration = await prisma.userIntegration.findUnique({
    where: { userId_provider: { userId: input.userId, provider: "YOUTUBE" } },
    select: { id: true },
  });
  return storage.run(
    {
      userId: input.userId,
      integrationId: integration?.id ?? null,
      channelId: input.channelId,
      sessionId: input.sessionId,
    },
    fn,
  );
}

export async function trackYoutubeCall<T>(
  input: { operation: string; method: string; units: number },
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  let ok = true;
  let httpStatus = 200;
  try {
    return await fn();
  } catch (error) {
    ok = false;
    httpStatus = httpStatusFrom(error);
    throw error;
  } finally {
    const ctx = storage.getStore();
    if (ctx?.integrationId) {
      const latencyMs = Date.now() - started;
      await prisma.integrationUsage
        .create({
          data: {
            userIntegrationId: ctx.integrationId,
            userId: ctx.userId,
            provider: "YOUTUBE",
            operation: input.operation,
            method: input.method,
            httpStatus,
            ok,
            latencyMs,
            units: ok ? input.units : 0,
            channelId: ctx.channelId,
            sessionId: ctx.sessionId,
          },
        })
        .catch(() => undefined);
      await prisma.userIntegration
        .update({
          where: { id: ctx.integrationId },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => undefined);
    }
  }
}

function httpStatusFrom(error: unknown): number {
  if (error && typeof error === "object") {
    const record = error as { code?: unknown; response?: { status?: unknown } };
    if (typeof record.response?.status === "number") return record.response.status;
    if (record.code === 403 || record.code === "403") return 403;
    if (record.code === 401 || record.code === "401") return 401;
  }
  return 500;
}
