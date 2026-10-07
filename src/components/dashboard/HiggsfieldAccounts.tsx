"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import {
  addHiggsfieldAccountAction,
  removeHiggsfieldAccountAction,
  setHiggsfieldAccountEnabledAction,
} from "@/app/dashboard/integrations/actions";
import type { HiggsfieldAccountView } from "@/features/higgsfield/accountView";

export function HiggsfieldCard({ accounts }: { accounts: HiggsfieldAccountView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const enabledCount = accounts.filter((account) => account.enabled).length;

  function run(task: () => Promise<{ ok: boolean; message?: string; error?: string }>, clear = false) {
    setNotice(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setNotice({ ok: false, text: result.error || "Request failed." });
        return;
      }
      setNotice(null);
      if (clear) {
        setEmail("");
        setApiKey("");
        setOpen(false);
      }
      router.refresh();
    });
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/providers/higgsfield.svg" alt="" className="h-8 w-8 object-contain" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-sm font-semibold text-foreground">Higgsfield</h3>
            <p className="truncate text-[11px] text-muted">
              {accounts.length === 0
                ? "Visual generation"
                : `${enabledCount} of ${accounts.length} enabled`}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Add a Higgsfield account"
          onClick={() => {
            setNotice(null);
            setOpen(true);
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-base leading-none text-foreground hover:bg-white/5"
        >
          +
        </button>
      </div>

      {accounts.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted">No API key yet. Use + to connect one.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {accounts.map((account) => (
            <li key={account.id} className="rounded-lg bg-surface-soft px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[11px] font-medium text-foreground">{account.email}</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={account.enabled}
                  aria-label={`${account.enabled ? "Disable" : "Enable"} ${account.email}`}
                  disabled={pending}
                  onClick={() => run(() => setHiggsfieldAccountEnabledAction(account.id, !account.enabled))}
                  className={`relative h-5 w-9 shrink-0 rounded-full ${
                    account.enabled ? "bg-success" : "bg-white/10"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      account.enabled ? "left-4" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              <div className="mt-0.5 flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-[10px] text-muted">Plan: pay as you go</p>
                  <p className="text-[10px] text-muted">Credits expire 1 year after they are added</p>
                  {account.lastErrorMessage ? (
                    <p className="text-[10px] text-accent">{account.lastErrorMessage}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => removeHiggsfieldAccountAction(account.id))}
                  className="shrink-0 text-[10px] font-semibold text-muted hover:text-accent disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {notice && !open ? (
        <p className="mt-2 text-[11px] font-semibold text-accent">{notice.text}</p>
      ) : null}

      <Modal
        open={open}
        title="Add Higgsfield"
        subtitle="Enter the account email and paste the API key."
        onClose={() => setOpen(false)}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => addHiggsfieldAccountAction(email, apiKey), true);
          }}
        >
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Account email"
            className="w-full rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          />
          <input
            type="password"
            required
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text");
              if (!text) return;
              event.preventDefault();
              setApiKey(text.replace(/\s+/g, ""));
            }}
            placeholder="Paste API key"
            className="w-full rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          />
          {notice ? (
            <p className={`text-xs font-semibold ${notice.ok ? "text-success" : "text-accent"}`}>{notice.text}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending || !apiKey.trim() || !email.trim()}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Connecting…" : "Connect"}
          </button>
        </form>
      </Modal>
    </article>
  );
}
