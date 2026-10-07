import type { IntegrationConnectionStatus } from "@/generated/prisma/enums";

export type HiggsfieldAccountView = {
  id: string;
  email: string;
  enabled: boolean;
  status: IntegrationConnectionStatus;
  maskedKey: string;
  estimateCredits: string | null;
  estimateUsd: string | null;
  lastErrorMessage: string | null;
};

export type HiggsfieldAccountQuote = HiggsfieldAccountView & {
  quoteCredits: string | null;
  quoteUsd: string | null;
  quoteError: string | null;
};
