import type { ScheduleCandidate } from "@/lib/scheduler/candidates";

export function scheduleCandidateLabel(candidate: Pick<ScheduleCandidate, "name" | "topic">): string {
  const name = candidate.name.trim();
  if (name) return name;
  const topic = candidate.topic.trim();
  if (topic) return topic;
  return "Untitled project";
}
