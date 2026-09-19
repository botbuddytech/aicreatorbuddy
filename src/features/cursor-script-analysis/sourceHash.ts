import { selectedTitle, type VideoProject } from "@/lib/videoProject";

function hash(input: string): string {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return String(value >>> 0);
}

export function scriptAnalysisSourceHash(project: VideoProject): string {
  return hash(
    JSON.stringify({
      script: project.fullScript,
      topic: project.summary.topic,
      title: selectedTitle(project)?.text ?? null,
      format: project.summary.format,
      intent: project.summary.intent,
      durationSeconds: project.summary.durationSeconds,
    }),
  );
}
