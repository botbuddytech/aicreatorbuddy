const RETRY_DELAYS_MS = [40, 120, 280];

function isWriteConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2034"
  );
}

/** Postgres rejects overlapping writes to the same session. Retry those, and only those. */
export async function withWriteRetry<T>(run: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await run();
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt];
      attempt += 1;
      if (delay === undefined || !isWriteConflict(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
