"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ActionButton } from "@/components/ui/ActionButton";
import { diffLines } from "@/lib/agent/diffLines";
import type { ProjectChange } from "@/lib/agent/types";

export function DiffCard({
  change,
  onAccept,
  onReject,
}: {
  change: ProjectChange;
  onAccept: () => void;
  onReject: () => void;
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rows = diffLines(change.before, change.after);
  const pending = change.status === "pending";
  const added = rows.filter((row) => row.kind === "add").length;
  const removed = rows.filter((row) => row.kind === "del").length;
  const status =
    change.status === "accepted" ? "Accepted" : change.status === "rejected" ? "Rejected" : change.summary;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-foreground">{change.label}</p>
          <p className="text-[11px] text-muted">
            {status}
            {added > 0 ? <span className="text-success"> +{added}</span> : null}
            {removed > 0 ? <span className="text-accent"> −{removed}</span> : null}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-white/5"
        >
          {open ? "Hide changes" : "Show changes"}
        </button>
      </div>
      {open ? (
      <div className="max-h-56 overflow-auto border-t border-border font-mono text-[12px] leading-5">
        {rows.map((row, index) => (
          <motion.div
            key={`${row.kind}-${index}`}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : 0.15,
              delay: reduced ? 0 : Math.min(index, 14) * 0.028,
              ease: "easeOut",
            }}
            className={`px-3 whitespace-pre-wrap ${
              row.kind === "add"
                ? "bg-success/10 text-success"
                : row.kind === "del"
                  ? "bg-accent/10 text-accent"
                  : "text-muted"
            }`}
          >
            <span className="mr-2 select-none opacity-70">
              {row.kind === "add" ? "+" : row.kind === "del" ? "−" : " "}
            </span>
            {row.text || " "}
          </motion.div>
        ))}
      </div>
      ) : null}
      {pending ? (
        <div className="flex justify-end gap-2 border-t border-border px-3 py-2">
          <ActionButton size="sm" variant="ghost" onClick={onReject}>
            Reject
          </ActionButton>
          <ActionButton size="sm" onClick={onAccept}>
            Accept
          </ActionButton>
        </div>
      ) : null}
    </div>
  );
}
