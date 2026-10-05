import { STEPS, type StepId } from "@/lib/videoProject";

export function blocked(step: StepId, title: string, message: string): string {
  const index = STEPS.findIndex((item) => item.id === step);
  const number = index >= 0 ? index + 1 : 1;
  return `${title} in step ${number}. ${message}`;
}
