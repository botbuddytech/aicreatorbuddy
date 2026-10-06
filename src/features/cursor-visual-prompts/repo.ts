import "server-only";

import { prisma } from "@/lib/db";
import {
  isStaleStylePrompt,
  VISUAL_STYLES,
  visualStyleById,
  type VisualStyleId,
} from "@/lib/visualStyles";

async function libraryPrompts(): Promise<Map<string, string>> {
  let rows = await prisma.visualStyle.findMany({ select: { id: true, prompt: true } });
  const found = new Set(rows.map((row) => row.id));
  const missing = VISUAL_STYLES.filter((style) => !found.has(style.id));
  if (missing.length > 0) {
    await prisma.visualStyle.createMany({
      data: missing.map((style) => ({ id: style.id, prompt: style.prompt })),
      skipDuplicates: true,
    });
    rows = await prisma.visualStyle.findMany({ select: { id: true, prompt: true } });
  }
  const stale = rows.filter((row) => isStaleStylePrompt(row.prompt));
  if (stale.length > 0) {
    await Promise.all(
      stale.map((row) => {
        const style = VISUAL_STYLES.find((item) => item.id === row.id);
        if (!style) return Promise.resolve();
        return prisma.visualStyle.update({
          where: { id: row.id },
          data: { prompt: style.prompt },
        });
      }),
    );
    rows = rows.map((row) => {
      const style = VISUAL_STYLES.find((item) => item.id === row.id);
      return style && isStaleStylePrompt(row.prompt) ? { ...row, prompt: style.prompt } : row;
    });
  }
  return new Map(rows.map((row) => [row.id, row.prompt]));
}

export async function listVisualStyleLibrary(): Promise<
  Array<{ id: VisualStyleId; label: string; prompt: string }>
> {
  const prompts = await libraryPrompts();
  return VISUAL_STYLES.map((style) => ({
    id: style.id,
    label: style.label,
    prompt: prompts.get(style.id)?.trim() || style.prompt,
  }));
}

export async function saveVisualStyleDefault(id: VisualStyleId, prompt: string): Promise<string> {
  const text = prompt.trim();
  await prisma.visualStyle.upsert({
    where: { id },
    create: { id, prompt: text },
    update: { prompt: text },
  });
  return text;
}

/** Session text wins. Otherwise the shared library row, then the built-in prompt. */
export async function resolveVisualStylePrompt(
  styleId: VisualStyleId | null,
  sessionPrompt: string | null,
): Promise<string | null> {
  if (!styleId) return null;
  const builtin = visualStyleById(styleId).prompt;
  const session = sessionPrompt?.trim();
  if (session && !isStaleStylePrompt(session)) return session;
  try {
    const prompts = await libraryPrompts();
    const library = prompts.get(styleId)?.trim();
    if (library && !isStaleStylePrompt(library)) return library;
  } catch (error) {
    console.error("[visual-styles] library read failed", error);
  }
  return builtin;
}
