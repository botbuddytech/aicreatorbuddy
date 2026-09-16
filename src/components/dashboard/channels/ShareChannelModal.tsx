"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "nextjs-toploader/app";
import {
  listChannelSharesAction,
  revokeShareAction,
  shareChannelAction,
  type ChannelShareItem,
} from "@/app/dashboard/channels/actions";
import { Modal } from "@/components/ui/Modal";
import type { ConnectedChannel } from "@/lib/youtube/repo";

type Notice = { kind: "success" | "error"; text: string };

export function ShareChannelModal({
  channel,
  onClose,
  onNotice,
}: {
  channel: ConnectedChannel;
  onClose: () => void;
  onNotice: (notice: Notice) => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [shares, setShares] = useState<ChannelShareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let current = true;
    listChannelSharesAction(channel.id)
      .then((items) => {
        if (current) setShares(items);
      })
      .catch((err: unknown) => {
        if (current) setError(err instanceof Error ? err.message : "Could not load access list.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [channel.id]);

  function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await shareChannelAction(channel.id, email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const items = await listChannelSharesAction(channel.id);
      setShares(items);
      setEmail("");
      onNotice({ kind: "success", text: result.message ?? "Access granted." });
      router.refresh();
    });
  }

  function revoke(share: ChannelShareItem) {
    if (!window.confirm(`Revoke ${share.email}'s access to "${channel.title}"?`)) return;
    setError("");
    startTransition(async () => {
      const result = await revokeShareAction(share.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShares((items) => items.filter((item) => item.id !== share.id));
      onNotice({ kind: "success", text: result.message ?? "Access revoked." });
      router.refresh();
    });
  }

  return (
    <Modal
      open
      title={`Manage access · ${channel.title}`}
      subtitle="Share this channel with another AI Creator Buddy account."
      onClose={onClose}
    >
      <form onSubmit={addPerson} className="space-y-3">
        <label htmlFor="share-channel-email" className="block text-xs font-semibold text-foreground">
          Email address
        </label>
        <div className="flex gap-2">
          <input
            id="share-channel-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="person@example.com"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface-soft px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add"}
          </button>
        </div>
        <p className="text-xs leading-5 text-muted">
          They can view, sync, and create with this channel. Only you can disconnect it or manage access.
        </p>
      </form>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <div className="mt-6 border-t border-border pt-4">
        <h4 className="text-sm font-semibold text-foreground">
          People with access <span className="text-muted">({shares.length})</span>
        </h4>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted">Loading access list…</p>
        ) : shares.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Only you have access right now.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{share.email}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {share.status === "active"
                      ? "Active"
                      : "Pending · access starts when they sign up with this email"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      share.status === "active"
                        ? "bg-success/15 text-success"
                        : "bg-white/5 text-muted"
                    }`}
                  >
                    {share.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => revoke(share)}
                    disabled={pending}
                    className="text-xs font-semibold text-accent hover:text-accent-dark disabled:opacity-60"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
