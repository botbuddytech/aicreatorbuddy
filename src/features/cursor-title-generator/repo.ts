import "server-only";

import { prisma } from "@/lib/db";
import {
  CURSOR_PROMPT_DEFAULTS,
  type CursorPromptKind,
} from "@/features/cursor-title-generator/prompt";

export type EffectiveCursorPrompts = {
  titleGeneration: string;
  titleScoring: string;
  scriptScoring: string;
  scriptLowEffort: string;
  customized: Record<CursorPromptKind, boolean>;
};

const PROMPT_FIELDS = {
  titleGeneration: "titleGenerationPrompt",
  titleScoring: "titleScoringPrompt",
  scriptScoring: "scriptScoringPrompt",
  scriptLowEffort: "scriptLowEffortPrompt",
} as const satisfies Record<
  CursorPromptKind,
  | "titleGenerationPrompt"
  | "titleScoringPrompt"
  | "scriptScoringPrompt"
  | "scriptLowEffortPrompt"
>;

export async function getEffectiveCursorPrompts(
  userId: string,
): Promise<EffectiveCursorPrompts> {
  const settings = await prisma.cursorPromptSettings.findUnique({
    where: { userId },
    select: {
      titleGenerationPrompt: true,
      titleScoringPrompt: true,
      scriptScoringPrompt: true,
      scriptLowEffortPrompt: true,
    },
  });

  return {
    titleGeneration:
      settings?.titleGenerationPrompt ?? CURSOR_PROMPT_DEFAULTS.titleGeneration,
    titleScoring: settings?.titleScoringPrompt ?? CURSOR_PROMPT_DEFAULTS.titleScoring,
    scriptScoring: settings?.scriptScoringPrompt ?? CURSOR_PROMPT_DEFAULTS.scriptScoring,
    scriptLowEffort:
      settings?.scriptLowEffortPrompt ?? CURSOR_PROMPT_DEFAULTS.scriptLowEffort,
    customized: {
      titleGeneration: settings?.titleGenerationPrompt != null,
      titleScoring: settings?.titleScoringPrompt != null,
      scriptScoring: settings?.scriptScoringPrompt != null,
      scriptLowEffort: settings?.scriptLowEffortPrompt != null,
    },
  };
}

export async function saveCursorPrompt(
  userId: string,
  kind: CursorPromptKind,
  prompt: string | null,
): Promise<EffectiveCursorPrompts> {
  const field = PROMPT_FIELDS[kind];
  await prisma.cursorPromptSettings.upsert({
    where: { userId },
    create: { userId, [field]: prompt },
    update: { [field]: prompt },
  });
  return getEffectiveCursorPrompts(userId);
}
