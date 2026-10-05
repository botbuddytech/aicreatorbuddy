import type { VidIqGrade, VidIqThumbFinding, VidIqThumbInsight } from "@/lib/videoProject";

export type ThumbnailScore = {
  score: number;
  grade: VidIqGrade;
  summary: string;
  strengths: VidIqThumbFinding[];
  improvements: VidIqThumbFinding[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function findings(value: unknown, withTip: boolean): VidIqThumbFinding[] {
  if (!Array.isArray(value)) return [];
  const items: VidIqThumbFinding[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    const message = typeof record?.message === "string" ? record.message.trim() : "";
    if (!message) continue;
    const tip = withTip && typeof record?.tip === "string" ? record.tip.trim() : "";
    items.push(tip ? { message, tip } : { message });
    if (items.length >= 6) break;
  }
  return items;
}

export function gradeFromThumbnailScore(score: number): VidIqGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

export function thumbnailScoreFromResult(value: unknown): ThumbnailScore | null {
  const record = asRecord(value);
  if (!record) return null;
  const nested = asRecord(record.result) ?? record;
  const rawScore = nested.score ?? record.score;
  if (typeof rawScore !== "number" || !Number.isFinite(rawScore)) return null;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const feedback = asRecord(nested.feedback) ?? asRecord(record.feedback);
  const summary = typeof feedback?.summary === "string" ? feedback.summary.trim() : "";
  return {
    score,
    grade: gradeFromThumbnailScore(score),
    summary,
    strengths: findings(feedback?.strengths, false),
    improvements: findings(feedback?.improvements, true),
  };
}

export function insightFromThumbnailScore(score: ThumbnailScore): VidIqThumbInsight {
  return {
    score: score.score,
    grade: score.grade,
    ctr: score.score,
    contrast: 0,
    textDensity: "Low",
    facePresent: false,
    notes: score.summary,
    strengths: score.strengths,
    improvements: score.improvements,
  };
}
