"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { HiggsfieldAccountQuote } from "@/features/higgsfield/accountView";
import { HIGGSFIELD_VIDEO_MODELS, type HiggsfieldModelId } from "@/features/higgsfield/models";

function readableAccountError(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (/not_enough_credits|insufficient/i.test(raw)) {
    return "Not enough credits on this account.";
  }
  return raw.replaceAll("_", " ");
}

export function HiggsfieldAccountPicker({
  open,
  prompt,
  durationSeconds,
  aspectRatio,
  busy,
  onClose,
  onChoose,
}: {
  open: boolean;
  prompt: string;
  durationSeconds: number;
  aspectRatio: string;
  busy: boolean;
  onClose: () => void;
  onChoose: (accountId: string, modelId: HiggsfieldModelId) => Promise<void>;
}) {
  const [accounts, setAccounts] = useState<HiggsfieldAccountQuote[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<HiggsfieldModelId>("kling-3-pro");
  const loading = open && !settled;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void fetch("/api/higgsfield/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, durationSeconds, aspectRatio, modelId }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as {
          accounts?: HiggsfieldAccountQuote[];
          note?: string | null;
          error?: string;
        } | null;
        if (!response.ok) throw new Error(body?.error || "Could not load Higgsfield accounts.");
        setAccounts(body?.accounts ?? []);
        setNote(body?.note ?? null);
        setError(null);
        setSettled(true);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not load Higgsfield accounts.");
        setSettled(true);
      });
    return () => controller.abort();
  }, [open, prompt, durationSeconds, aspectRatio, modelId]);

  return (
    <Modal
      open={open}
      title="Choose a Higgsfield account"
      subtitle="Choose the model, then the account. The price is for this scene."
      size="lg"
      onClose={onClose}
    >
      <div className="space-y-3">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Model</span>
          <select
            value={modelId}
            onChange={(event) => {
              setModelId(event.target.value as HiggsfieldModelId);
              setSettled(false);
              setAccounts([]);
              setRowError({});
            }}
            className="mt-1 w-full rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          >
            {HIGGSFIELD_VIDEO_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        {note ? <p className="text-xs text-muted">{note}</p> : null}
        {loading ? <p className="text-sm text-muted">Checking each account…</p> : null}
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        {!loading && !error && accounts.length === 0 ? (
          <p className="text-sm text-muted">
            No enabled Higgsfield account. Connect one on the AI Integrations page, and leave its toggle on.
          </p>
        ) : null}
        <ul className="space-y-2">
          {accounts.map((account) => {
            const message = readableAccountError(rowError[account.id] ?? account.quoteError);
            const blocked = Boolean(account.quoteError);
            const pending = pendingId === account.id;
            return (
              <li key={account.id}>
                <button
                  type="button"
                  disabled={busy || pendingId !== null || blocked}
                  onClick={() => {
                    setPendingId(account.id);
                    setRowError((current) => {
                      const next = { ...current };
                      delete next[account.id];
                      return next;
                    });
                    void onChoose(account.id, modelId)
                      .catch((cause: unknown) => {
                        setRowError((current) => ({
                          ...current,
                          [account.id]:
                            cause instanceof Error ? cause.message : "Could not start that account.",
                        }));
                      })
                      .finally(() => setPendingId(null));
                  }}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-3 text-left disabled:cursor-not-allowed ${
                    blocked
                      ? "border-accent/40 bg-accent/5"
                      : "border-border bg-surface-soft hover:border-foreground/20 hover:bg-white/5"
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/providers/higgsfield.svg" alt="" className="h-8 w-8 object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {account.email}
                    </span>
                    <span className="mt-1 inline-flex rounded-md bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted">
                      {account.maskedKey}
                    </span>
                    {message ? (
                      <span className="mt-1 block text-[11px] font-medium text-accent">{message}</span>
                    ) : (
                      <span className="mt-1 block text-[11px] text-muted">Pay as you go</span>
                    )}
                  </span>
                  <span className="text-right">
                    <span className="block text-[10px] uppercase tracking-wide text-muted">This scene</span>
                    <span className="mt-0.5 block text-sm font-semibold text-foreground">
                      {pending
                        ? "Starting…"
                        : account.quoteCredits
                          ? `${account.quoteCredits} credits`
                          : "—"}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {account.quoteUsd ? `$${account.quoteUsd}` : "No price yet"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <a
          href="https://console.higgsfield.ai"
          target="_blank"
          rel="noreferrer"
          className="inline-block text-[11px] font-semibold text-muted hover:text-foreground"
        >
          Remaining balance is in the Higgsfield Console
        </a>
      </div>
    </Modal>
  );
}
