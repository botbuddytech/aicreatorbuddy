export const SCRIPT_ANALYSIS_LIMITS = {
  script: 120_000,
  topic: 500,
  context: 100,
  title: 100,
  references: 5,
  reference: 50_000,
  keywords: 10,
  keyword: 50,
  notes: 8,
  note: 300,
  findings: 8,
  findingId: 80,
  findingTitle: 120,
  findingDetail: 500,
  summary: 500,
} as const;

export type CursorScriptContext = {
  topic: string;
  title: string | null;
  format: string;
  intent: string;
  durationSeconds: number;
};

export type CursorScriptScoreRequest = {
  script: string;
  context: CursorScriptContext;
};

export type CursorScriptScoreResult = {
  score: number;
  grade: "A" | "B" | "C" | "D";
  hook: number;
  retention: number;
  keywordFit: number;
  cta: number;
  keywords: string[];
  notes: string[];
};

export type CursorScriptLowEffortRequest = {
  script: string;
  durationSeconds: number;
  references: string[];
};

export type CursorLowEffortFinding = {
  id: string;
  severity: "warn" | "fail";
  title: string;
  detail: string;
};

export type CursorScriptLowEffortResult = {
  summary: string;
  findings: CursorLowEffortFinding[];
  score: number;
  verdict: "pass" | "warn" | "fail";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number, allowEmpty = false): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if ((!normalized && !allowEmpty) || normalized.length > max) return null;
  return normalized;
}

function score(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : null;
}

function stringList(value: unknown, count: number, length: number): string[] | null {
  if (!Array.isArray(value) || value.length > count) return null;
  const values = value.map((item) => text(item, length)).filter((item): item is string => Boolean(item));
  return values.length === value.length ? [...new Set(values)] : null;
}

export function gradeFromScore(value: number): "A" | "B" | "C" | "D" {
  if (value >= 85) return "A";
  if (value >= 70) return "B";
  if (value >= 55) return "C";
  return "D";
}

export function parseCursorScriptScoreRequest(value: unknown): CursorScriptScoreRequest | null {
  if (!isRecord(value) || !isRecord(value.context)) return null;
  const script = text(value.script, SCRIPT_ANALYSIS_LIMITS.script);
  const topic = text(value.context.topic, SCRIPT_ANALYSIS_LIMITS.topic);
  const title =
    value.context.title === null
      ? null
      : text(value.context.title, SCRIPT_ANALYSIS_LIMITS.title);
  const format = text(value.context.format, SCRIPT_ANALYSIS_LIMITS.context);
  const intent = text(value.context.intent, SCRIPT_ANALYSIS_LIMITS.context);
  const durationSeconds = value.context.durationSeconds;
  if (
    !script ||
    !topic ||
    (value.context.title !== null && !title) ||
    !format ||
    !intent ||
    typeof durationSeconds !== "number" ||
    !Number.isInteger(durationSeconds) ||
    durationSeconds < 1 ||
    durationSeconds > 7_200
  ) {
    return null;
  }
  return { script, context: { topic, title, format, intent, durationSeconds } };
}

export function normalizeCursorScriptScore(value: unknown): CursorScriptScoreResult | null {
  if (!isRecord(value)) return null;
  const overall = score(value.score);
  const hook = score(value.hook);
  const retention = score(value.retention);
  const keywordFit = score(value.keywordFit);
  const cta = score(value.cta);
  const keywords = stringList(
    value.keywords,
    SCRIPT_ANALYSIS_LIMITS.keywords,
    SCRIPT_ANALYSIS_LIMITS.keyword,
  );
  const notes = stringList(
    value.notes,
    SCRIPT_ANALYSIS_LIMITS.notes,
    SCRIPT_ANALYSIS_LIMITS.note,
  );
  if (
    overall === null ||
    hook === null ||
    retention === null ||
    keywordFit === null ||
    cta === null ||
    !keywords ||
    !notes
  ) {
    return null;
  }
  return {
    score: overall,
    grade: gradeFromScore(overall),
    hook,
    retention,
    keywordFit,
    cta,
    keywords,
    notes,
  };
}

export function parseCursorScriptLowEffortRequest(
  value: unknown,
): CursorScriptLowEffortRequest | null {
  if (!isRecord(value) || !Array.isArray(value.references)) return null;
  const script = text(value.script, SCRIPT_ANALYSIS_LIMITS.script);
  const durationSeconds = value.durationSeconds;
  if (
    !script ||
    typeof durationSeconds !== "number" ||
    !Number.isInteger(durationSeconds) ||
    durationSeconds < 1 ||
    durationSeconds > 7_200 ||
    value.references.length > SCRIPT_ANALYSIS_LIMITS.references
  ) {
    return null;
  }
  const references = value.references.map((item) =>
    text(item, SCRIPT_ANALYSIS_LIMITS.reference, true),
  );
  if (references.some((item) => item === null)) return null;
  return { script, durationSeconds, references: references as string[] };
}

export function normalizeCursorScriptLowEffort(
  value: unknown,
): CursorScriptLowEffortResult | null {
  if (!isRecord(value) || !Array.isArray(value.findings)) return null;
  const summary = text(value.summary, SCRIPT_ANALYSIS_LIMITS.summary);
  if (!summary || value.findings.length > SCRIPT_ANALYSIS_LIMITS.findings) return null;

  const ids = new Set<string>();
  const findings: CursorLowEffortFinding[] = [];
  for (const valueFinding of value.findings) {
    if (!isRecord(valueFinding)) return null;
    const id = text(valueFinding.id, SCRIPT_ANALYSIS_LIMITS.findingId);
    const title = text(valueFinding.title, SCRIPT_ANALYSIS_LIMITS.findingTitle);
    const detail = text(valueFinding.detail, SCRIPT_ANALYSIS_LIMITS.findingDetail);
    const severity = valueFinding.severity;
    if (
      !id ||
      ids.has(id) ||
      !title ||
      !detail ||
      (severity !== "warn" && severity !== "fail")
    ) {
      return null;
    }
    ids.add(id);
    findings.push({ id, title, detail, severity });
  }

  const deducted = findings.reduce(
    (total, finding) => total + (finding.severity === "fail" ? 22 : 10),
    0,
  );
  const resultScore = Math.max(0, 100 - deducted);
  const verdict =
    findings.some((finding) => finding.severity === "fail") || resultScore < 40
      ? "fail"
      : findings.length || resultScore < 70
        ? "warn"
        : "pass";
  return { summary, findings, score: resultScore, verdict };
}
