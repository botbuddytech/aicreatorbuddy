"use client";

import { useState } from "react";
import type { PipelineStep, PipelineStatus } from "@/lib/dashboardContent";

const statusStyles: Record<PipelineStatus, string> = {
  done: "bg-success/15 text-success",
  active: "bg-accent/15 text-accent",
  queued: "bg-white/5 text-muted",
};

export function WorkflowStepper({ steps }: { steps: PipelineStep[] }) {
  const [items, setItems] = useState(steps);
  const [selectedId, setSelectedId] = useState(
    steps.find((s) => s.status === "active")?.id ?? steps[0]?.id ?? "",
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState("");

  const selected = items.find((s) => s.id === selectedId) ?? items[0];

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function runAction(action: "preview" | "regenerate" | "done") {
    if (!selected) return;
    setBusy(action);
    window.setTimeout(() => {
      if (action === "done") {
        setItems((prev) =>
          prev.map((step) =>
            step.id === selected.id ? { ...step, status: "done" } : step,
          ),
        );
        flash(`${selected.tool} marked done`);
      } else if (action === "regenerate") {
        setItems((prev) =>
          prev.map((step) =>
            step.id === selected.id
              ? { ...step, status: "active", previewBody: `${step.previewBody}\n\n[Regenerated demo take]` }
              : step,
          ),
        );
        flash(`${selected.tool} regenerated (demo)`);
      } else {
        flash(`Previewing ${selected.tool}…`);
      }
      setBusy(null);
    }, 700);
  }

  function startEdit() {
    if (!selected) return;
    setDraft(selected.previewBody);
    setEditing(true);
  }

  function saveEdit() {
    if (!selected) return;
    setItems((prev) =>
      prev.map((step) =>
        step.id === selected.id ? { ...step, previewBody: draft } : step,
      ),
    );
    setEditing(false);
    flash("Edits saved (local demo)");
  }

  if (!selected) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        {items.map((step, index) => {
          const active = step.id === selected.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                setSelectedId(step.id);
                setEditing(false);
              }}
              className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                active
                  ? "border-accent/50 bg-accent/10"
                  : "border-border bg-surface hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  {String(index + 1).padStart(2, "0")} · {step.tool}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyles[step.status]}`}
                >
                  {step.status}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">{step.title}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-accent">
              {selected.tool}
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-foreground">
              {selected.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{selected.description}</p>
            <p className="mt-2 text-xs text-muted">{selected.editHint}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-surface-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {selected.previewTitle}
          </p>
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              className="glass-field mt-3 w-full rounded-lg border border-white/12 px-3 py-2 font-mono text-xs leading-relaxed text-foreground outline-none focus:border-accent/50"
            />
          ) : (
            <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
              {selected.previewBody}
            </pre>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
              >
                Save edits
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/5"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startEdit}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/5"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => runAction("preview")}
                disabled={busy !== null}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/5 disabled:opacity-60"
              >
                {busy === "preview" ? "Previewing…" : "Preview"}
              </button>
              <button
                type="button"
                onClick={() => runAction("regenerate")}
                disabled={busy !== null}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/5 disabled:opacity-60"
              >
                {busy === "regenerate" ? "Regenerating…" : "Regenerate"}
              </button>
              <button
                type="button"
                onClick={() => runAction("done")}
                disabled={busy !== null}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
              >
                {busy === "done" ? "Saving…" : "Mark done"}
              </button>
            </>
          )}
        </div>

        {toast ? (
          <p className="mt-4 rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-muted">
            {toast}
          </p>
        ) : null}
      </div>
    </div>
  );
}
