import { normalizeEmail } from "@/lib/auth/password";
import { prisma } from "@/lib/db";

export async function linkPendingShares({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  await prisma.channelShare.updateMany({
    where: { email: normalizedEmail, userId: null },
    data: { userId, acceptedAt: new Date() },
  });
}
