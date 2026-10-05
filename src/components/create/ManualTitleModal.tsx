"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";

const TITLE_LIMIT = 100;
const MAX_TITLES = 20;

type ManualTitleModalProps = {
  open: boolean;
  existingCount: number;
  onClose: () => void;
  onAdd: (titles: string[]) => void;
};

export function ManualTitleModal({
  open,
  existingCount,
  onClose,
  onAdd,
}: ManualTitleModalProps) {
  const [rows, setRows] = useState<string[]>([""]);
  const remaining = Math.max(0, MAX_TITLES - existingCount);

  function close() {
    setRows([""]);
    onClose();
  }

  function updateRow(index: number, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? value : row)));
  }

  function removeRow(index: number) {
    setRows((current) => (current.length === 1 ? [""] : current.filter((_, rowIndex) => rowIndex !== index)));
  }

  function save() {
    const titles = rows.map((row) => row.trim()).filter(Boolean).slice(0, remaining);
    if (titles.length === 0) return;
    onAdd(titles);
    setRows([""]);
    onClose();
  }

  const ready = rows.some((row) => row.trim().length > 0) && remaining > 0;

  return (
    <Modal
      open={open}
      title="Add titles"
      subtitle={
        remaining === 0
          ? "This video already has 20 titles."
          : `Type one title per field. ${remaining} slot${remaining === 1 ? "" : "s"} left.`
      }
      onClose={close}
    >
      {remaining === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          Remove a title from the list before adding another.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={row}
                maxLength={TITLE_LIMIT}
                autoFocus={index === 0}
                onChange={(event) => updateRow(index, event.target.value)}
                placeholder={`Title ${index + 1}`}
                aria-label={`Title ${index + 1}`}
                className="glass-field w-full rounded-xl border border-white/12 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-muted hover:bg-white/5 hover:text-foreground"
              >
                Remove
              </button>
            </div>
          ))}
          {rows.length < remaining ? (
            <button
              type="button"
              onClick={() => setRows((current) => [...current, ""])}
              className="text-sm font-semibold text-accent hover:text-accent-dark"
            >
              Add another title
            </button>
          ) : null}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-white/5"
        >
          Cancel
        </button>
        {remaining > 0 ? (
          <ActionButton onClick={save} disabled={!ready}>
            Add titles
          </ActionButton>
        ) : null}
      </div>
    </Modal>
  );
}
