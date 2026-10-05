export type VidiqCreditQuota = {
  plan: string | null;
  used: number | null;
  limit: number | null;
  remaining: number | null;
  resetsAt: Date | null;
};

function whole(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

/** vidIQ `totalCredits` is what is left. Used is the plan cap minus that remainder. */
export function quotaFromVidiqBalance(balance: Record<string, unknown>): VidiqCreditQuota {
  const remaining = whole(balance.totalCredits);
  const maxRenewable = whole(balance.maxRenewableCredits) ?? 0;
  const maxAddOn = whole(balance.maxAddOnCredits) ?? 0;
  const limit = maxRenewable + maxAddOn;
  const rawType = typeof balance.type === "string" ? balance.type.trim() : "";
  const plan = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : null;
  return {
    plan,
    used: remaining != null && limit > 0 ? Math.max(0, limit - remaining) : null,
    limit: limit > 0 ? limit : null,
    remaining,
    resetsAt:
      typeof balance.renewableResetsAt === "string" ? new Date(balance.renewableResetsAt) : null,
  };
}
