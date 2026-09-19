import { prisma } from "@/lib/db";

export async function isDeletedVideoSession(sessionId: string): Promise<boolean> {
  const deleted = await prisma.deletedVideoSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  return Boolean(deleted);
}

export function isDeletedVideoSessionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLocaleLowerCase().includes("video session has been permanently deleted")
  );
}
