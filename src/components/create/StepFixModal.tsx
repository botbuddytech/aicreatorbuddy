"use client";

import { Modal } from "@/components/ui/Modal";
import { STEPS, type StepId } from "@/lib/videoProject";

type StepFixModalProps = {
  open: boolean;
  title: string;
  message: string;
  step: StepId;
  onClose: () => void;
  closeLabel?: string;
};

export function stepFixTarget(step: StepId): { number: number; label: string } {
  const index = STEPS.findIndex((item) => item.id === step);
  return {
    number: index >= 0 ? index + 1 : 1,
    label: STEPS[index]?.label ?? "This step",
  };
}

/** A closable notice for something that has to be fixed in a named step. */
export function StepFixModal({
  open,
  title,
  message,
  step,
  onClose,
  closeLabel = "Close",
}: StepFixModalProps) {
  const target = stepFixTarget(step);

  return (
    <Modal
      open={open}
      title={`${title} in step ${target.number}`}
      header={
        <p className="mt-3 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
          Fix this in step {target.number} · {target.label}
        </p>
      }
      onClose={onClose}
    >
      <p className="text-sm leading-relaxed text-muted">{message}</p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          {closeLabel}
        </button>
      </div>
    </Modal>
  );
}
