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
  thumbnailPromptGeneration: string;
  scriptGeneration: string;
  descriptionGeneration: string;
  visualPromptGeneration: string;
  customized: Record<CursorPromptKind, boolean>;
};

const PROMPT_FIELDS = {
  titleGeneration: "titleGenerationPrompt",
  titleScoring: "titleScoringPrompt",
  scriptScoring: "scriptScoringPrompt",
  scriptLowEffort: "scriptLowEffortPrompt",
  thumbnailPromptGeneration: "thumbnailPromptGenerationPrompt",
  scriptGeneration: "scriptGenerationPrompt",
  descriptionGeneration: "descriptionGenerationPrompt",
  visualPromptGeneration: "visualPromptGenerationPrompt",
} as const satisfies Record<
  CursorPromptKind,
  | "titleGenerationPrompt"
  | "titleScoringPrompt"
  | "scriptScoringPrompt"
  | "scriptLowEffortPrompt"
  | "thumbnailPromptGenerationPrompt"
  | "scriptGenerationPrompt"
  | "descriptionGenerationPrompt"
  | "visualPromptGenerationPrompt"
>;

const DEFAULT_FIELDS = {
  titleGeneration: "titleGenerationDefault",
  titleScoring: "titleScoringDefault",
  scriptScoring: "scriptScoringDefault",
  scriptLowEffort: "scriptLowEffortDefault",
  thumbnailPromptGeneration: "thumbnailPromptGenerationDefault",
  scriptGeneration: "scriptGenerationDefault",
  descriptionGeneration: "descriptionGenerationDefault",
  visualPromptGeneration: "visualPromptGenerationDefault",
} as const satisfies Record<
  CursorPromptKind,
  | "titleGenerationDefault"
  | "titleScoringDefault"
  | "scriptScoringDefault"
  | "scriptLowEffortDefault"
  | "thumbnailPromptGenerationDefault"
  | "scriptGenerationDefault"
  | "descriptionGenerationDefault"
  | "visualPromptGenerationDefault"
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
      thumbnailPromptGenerationPrompt: true,
      scriptGenerationPrompt: true,
      descriptionGenerationPrompt: true,
      visualPromptGenerationPrompt: true,
      titleGenerationDefault: true,
      titleScoringDefault: true,
      scriptScoringDefault: true,
      scriptLowEffortDefault: true,
      thumbnailPromptGenerationDefault: true,
      scriptGenerationDefault: true,
      descriptionGenerationDefault: true,
      visualPromptGenerationDefault: true,
    },
  });

  const resolve = (kind: CursorPromptKind) =>
    settings?.[PROMPT_FIELDS[kind]] ??
    settings?.[DEFAULT_FIELDS[kind]] ??
    CURSOR_PROMPT_DEFAULTS[kind];

  return {
    titleGeneration: resolve("titleGeneration"),
    titleScoring: resolve("titleScoring"),
    scriptScoring: resolve("scriptScoring"),
    scriptLowEffort: resolve("scriptLowEffort"),
    thumbnailPromptGeneration: resolve("thumbnailPromptGeneration"),
    scriptGeneration: resolve("scriptGeneration"),
    descriptionGeneration: resolve("descriptionGeneration"),
    visualPromptGeneration: resolve("visualPromptGeneration"),
    customized: {
      titleGeneration: settings?.titleGenerationPrompt != null,
      titleScoring: settings?.titleScoringPrompt != null,
      scriptScoring: settings?.scriptScoringPrompt != null,
      scriptLowEffort: settings?.scriptLowEffortPrompt != null,
      thumbnailPromptGeneration: settings?.thumbnailPromptGenerationPrompt != null,
      scriptGeneration: settings?.scriptGenerationPrompt != null,
      descriptionGeneration: settings?.descriptionGenerationPrompt != null,
      visualPromptGeneration: settings?.visualPromptGenerationPrompt != null,
    },
  };
}

export async function saveCursorPromptDefault(
  userId: string,
  kind: CursorPromptKind,
  prompt: string,
): Promise<EffectiveCursorPrompts> {
  const active = PROMPT_FIELDS[kind];
  const fallback = DEFAULT_FIELDS[kind];
  await prisma.cursorPromptSettings.upsert({
    where: { userId },
    create: { userId, [active]: prompt, [fallback]: prompt },
    update: { [active]: prompt, [fallback]: prompt },
  });
  return getEffectiveCursorPrompts(userId);
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
