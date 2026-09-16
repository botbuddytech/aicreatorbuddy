import type { CreateStep, StepState } from "@/generated/prisma/enums";
import type { StepId, StepStatus } from "@/lib/videoProject";

export function toCreateStep(step: StepId): CreateStep {
  return step.toUpperCase() as CreateStep;
}

export function fromCreateStep(step: CreateStep): StepId {
  return step.toLowerCase() as StepId;
}

export function toStepState(state: StepStatus): StepState {
  return state.replace("-", "_").toUpperCase() as StepState;
}

export function jsonValue(value: unknown): object {
  return JSON.parse(JSON.stringify(value)) as object;
}

export function safeDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
