export const CURSOR_TITLE_LIMITS = {
  topic: 500,
  contextField: 100,
  title: 100,
  id: 100,
  minTitles: 1,
  maxTitles: 20,
} as const;

export type CursorTitleContext = {
  topic: string;
  format: string;
  intent: string;
  duration: string;
};

export type CursorTitleRequest = {
  context: CursorTitleContext;
};

export type CursorTitleResponse = {
  titles: string[];
};

export type CursorTitleScoreInput = {
  id: string;
  text: string;
};

export type CursorTitleScore = {
  id: string;
  score: number;
  rank: number;
};

export type CursorTitleScoreRequest = {
  context: CursorTitleContext;
  titles: CursorTitleScoreInput[];
};

export type CursorTitleScoreResponse = {
  scores: CursorTitleScore[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

function parseContext(value: unknown): CursorTitleContext | null {
  if (!isRecord(value)) return null;
  const topic = boundedText(value.topic, CURSOR_TITLE_LIMITS.topic);
  const format = boundedText(value.format, CURSOR_TITLE_LIMITS.contextField);
  const intent = boundedText(value.intent, CURSOR_TITLE_LIMITS.contextField);
  const duration = boundedText(value.duration, CURSOR_TITLE_LIMITS.contextField);

  if (!topic || !format || !intent || !duration) return null;
  return { topic, format, intent, duration };
}

export function parseCursorTitleRequest(value: unknown): CursorTitleRequest | null {
  if (!isRecord(value)) return null;
  const context = parseContext(value.context);
  return context ? { context } : null;
}

export function parseCursorTitleScoreRequest(value: unknown): CursorTitleScoreRequest | null {
  if (!isRecord(value) || !Array.isArray(value.titles)) return null;
  const context = parseContext(value.context);
  if (
    !context ||
    value.titles.length < CURSOR_TITLE_LIMITS.minTitles ||
    value.titles.length > CURSOR_TITLE_LIMITS.maxTitles
  ) {
    return null;
  }

  const ids = new Set<string>();
  const titles: CursorTitleScoreInput[] = [];
  for (const candidate of value.titles) {
    if (!isRecord(candidate)) return null;
    const id = boundedText(candidate.id, CURSOR_TITLE_LIMITS.id);
    const text = boundedText(candidate.text, CURSOR_TITLE_LIMITS.title);
    if (!id || !text || ids.has(id)) return null;
    ids.add(id);
    titles.push({ id, text });
  }
  return { context, titles };
}

export function normalizeCursorTitles(value: unknown): string[] | null {
  if (!isRecord(value) || !Array.isArray(value.titles)) return null;

  const unique = new Map<string, string>();
  for (const candidate of value.titles) {
    if (typeof candidate !== "string") continue;
    const title = candidate.replace(/\s+/g, " ").trim();
    if (!title || title.length > CURSOR_TITLE_LIMITS.title) continue;
    const key = title.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, title);
  }

  const titles = [...unique.values()].slice(0, CURSOR_TITLE_LIMITS.maxTitles);
  return titles.length >= CURSOR_TITLE_LIMITS.minTitles ? titles : null;
}

export function normalizeCursorTitleScores(
  value: unknown,
  expectedTitles: CursorTitleScoreInput[],
): CursorTitleScore[] | null {
  if (!isRecord(value) || !Array.isArray(value.scores)) return null;
  const expected = new Map(expectedTitles.map((title, index) => [title.id, index]));
  if (value.scores.length !== expected.size) return null;

  const seen = new Set<string>();
  const scores: Array<{ id: string; score: number; index: number }> = [];
  for (const candidate of value.scores) {
    if (!isRecord(candidate)) return null;
    const id = boundedText(candidate.id, CURSOR_TITLE_LIMITS.id);
    const score = candidate.score;
    if (
      !id ||
      !expected.has(id) ||
      seen.has(id) ||
      typeof score !== "number" ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > 100
    ) {
      return null;
    }
    seen.add(id);
    scores.push({ id, score, index: expected.get(id) ?? 0 });
  }

  return scores
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ id, score }, index) => ({ id, score, rank: index + 1 }));
}
