"use client";

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
  const rows = diffLines(change.before, change.after);
  const pending = change.status === "pending";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-[13px] font-medium text-foreground">{change.label}</p>
        <p className="text-[11px] text-muted">
          {change.status === "accepted"
            ? "Accepted"
            : change.status === "rejected"
              ? "Rejected"
              : change.summary}
        </p>
      </div>
      <div className="max-h-56 overflow-auto font-mono text-[12px] leading-5">
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
