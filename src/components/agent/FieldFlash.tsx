"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import type { FlashField } from "@/lib/agent/types";
import { useAgentStore } from "@/components/agent/store";

export function FieldFlash({
  field,
  className = "",
  children,
}: {
  field: FlashField;
  className?: string;
  children: ReactNode;
}) {
  const token = useAgentStore((state) => state.flashes[field] ?? 0);
  const reduced = useReducedMotion();

  return (
    <div className={`relative ${className}`.trim()}>
      {token > 0 && !reduced ? (
        <span key={token} className="agent-field-flash pointer-events-none absolute inset-0 rounded-[inherit]" />
      ) : null}
      {children}
    </div>
  );
}
