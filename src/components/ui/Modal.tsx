"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SIZES = {
  sm: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

type ModalSize = keyof typeof SIZES;

type ModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  header?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({
  open,
  title,
  subtitle,
  size = "sm",
  header,
  onClose,
  children,
}: ModalProps) {
  const titleId = useId();
  const subtitleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (document.fullscreenElement) return;
        onCloseRef.current();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface outline-none ${SIZES[size]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <h3 id={titleId} className="font-display text-lg font-semibold text-foreground">
              {title}
            </h3>
            {subtitle ? (
              <p id={subtitleId} className="mt-0.5 text-sm text-muted">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {header ? <div className="shrink-0 px-5">{header}</div> : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
