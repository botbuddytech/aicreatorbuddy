"use client";

import { useState, type ReactNode } from "react";
import { ActionButton } from "@/components/ui/ActionButton";

export function OptionCard({
  selected,
  onSelect,
  onRegenerate,
  regenerating,
  onEdit,
  editSeed = "",
  extraActions,
  footer,
  badge,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
  onEdit?: (next: string) => void;
  editSeed?: string;
  extraActions?: ReactNode;
  footer?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div
      className={`rounded-2xl border p-4 ${
        selected ? "border-accent/50 bg-accent/10" : "border-border bg-surface"
      }`}
    >
      {badge ? <div className="mb-2">{badge}</div> : null}
      {children}
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton size="sm" variant={selected ? "primary" : "secondary"} onClick={onSelect}>
          {selected ? "Selected" : "Select"}
        </ActionButton>
        {onRegenerate ? (
          <ActionButton
            size="sm"
            variant="secondary"
            onClick={onRegenerate}
            loading={Boolean(regenerating)}
            loadingLabel="…"
          >
            Regenerate
          </ActionButton>
        ) : null}
        {onEdit ? (
          <ActionButton
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(editSeed);
              setEditing((value) => !value);
            }}
          >
            {editing ? "Close" : "Edit"}
          </ActionButton>
        ) : null}
        {extraActions}
      </div>
      {editing && onEdit ? (
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Replacement text…"
            className="glass-field w-full rounded-xl border border-white/12 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50"
          />
          <ActionButton
            size="sm"
            onClick={() => {
              if (!draft.trim()) return;
              onEdit(draft.trim());
              setEditing(false);
            }}
          >
            Save
          </ActionButton>
        </div>
      ) : null}
      {footer}
    </div>
  );
}
