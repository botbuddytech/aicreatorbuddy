"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeCredentialAction,
  saveApiKeyAction,
  setIntegrationEnabledAction,
  testIntegrationAction,
} from "@/app/dashboard/integrations/actions";
import {
  INTEGRATION_STATUS_DOT,
  INTEGRATION_STATUS_LABEL,
  INTEGRATION_STATUS_PILL,
  formatCount,
  formatInt,
  quotaPercent,
  type Integration,
} from "@/lib/dashboardContent";
import type { UserIntegrationState } from "@/lib/integrations/repo";

const PROVIDER_LOGOS: Record<string, string> = {
  youtube: "/icons/providers/youtube.svg",
  vidiq: "/icons/providers/vidiq.png",
  chatgpt: "/icons/providers/chatgpt.svg",
  gemini: "/icons/providers/gemini.png",
  elevenlabs: "/icons/providers/elevenlabs.svg",
  seedance: "/icons/providers/seedance.svg",
  remotion: "/icons/providers/remotion.svg",
  higgsfield: "/icons/providers/higgsfield.svg",
};

export function IntegrationCard({
  integration,
  liveState,
  onViewUsage,
}: {
  integration: Integration;
  liveState: UserIntegrationState | null;
  onViewUsage: () => void;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const connected = liveState?.status === "CONNECTED";
  const displayStatus = !connected
    ? "disconnected"
    : liveState && !liveState.enabled
      ? "degraded"
      : integration.status === "disconnected"
        ? "operational"
        : integration.status;
  const statusLabel =
    liveState?.status === "NEEDS_REAUTH"
      ? "Reconnect required"
      : liveState?.status === "INVALID_KEY"
        ? "Invalid key"
        : connected && !liveState?.enabled
          ? "Paused"
          : INTEGRATION_STATUS_LABEL[displayStatus];
  const percent = quotaPercent(integration.quota);
  const isVidiq = liveState?.integrationId === "vidiq";
  const isElevenLabs = liveState?.integrationId === "elevenlabs";
  const isYoutube = liveState?.integrationId === "youtube";
  const remaining =
    integration.quota.limit > 0
      ? Math.max(0, integration.quota.limit - integration.quota.used)
      : null;
  const quotaLine = isYoutube
    ? `${formatInt(integration.quota.used)} quota units recorded by this app`
    : isElevenLabs && liveState?.quotaNote && remaining == null
    ? liveState.quotaNote
    : isVidiq && !liveState?.quotaLimit
      ? "Credits unavailable"
      : remaining != null
        ? `${formatInt(remaining)} ${isVidiq ? "left" : "remaining"}`
        : `${formatCount(integration.quota.used)} / ${formatCount(integration.quota.limit)} ${integration.quota.unit}`;

  function runAction(task: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setNotice(null);
    startTransition(async () => {
      const result = await task();
      setNotice({
        ok: result.ok,
        text: result.ok ? result.message || "Saved." : result.error || "Request failed.",
      });
      if (result.ok) {
        setApiKey("");
        router.refresh();
      }
    });
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-soft">
            {PROVIDER_LOGOS[integration.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={PROVIDER_LOGOS[integration.id]} alt="" className="h-8 w-8 object-contain" />
            ) : (
              <span className={`flex h-8 w-8 items-center justify-center text-[10px] font-bold text-white ${integration.color}`}>
                {integration.initials}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-sm font-semibold text-foreground">
              {integration.name}
            </h3>
            <p className="truncate text-[11px] text-muted">{integration.category}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={liveState?.enabled ?? false}
          aria-label={`${liveState?.enabled ? "Disable" : "Enable"} ${integration.name}`}
          disabled={!connected || pending}
          onClick={() =>
            liveState &&
            runAction(() =>
              setIntegrationEnabledAction(liveState.integrationId, !liveState.enabled),
            )
          }
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            liveState?.enabled ? "bg-success" : "bg-white/10"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              liveState?.enabled ? "left-4" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${INTEGRATION_STATUS_PILL[displayStatus]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${INTEGRATION_STATUS_DOT[displayStatus]}`} />
          {statusLabel}
        </span>
        <span className="truncate text-[11px] text-muted">{quotaLine}</span>
      </div>
      {percent > 0 && liveState?.quotaLimit ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-soft">
          <div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
        </div>
      ) : null}

      {liveState?.sharedEnv ? (
        <p className="mt-2 truncate text-[11px] text-muted">
          {liveState.accountLabel ?? "Shared server key"}
        </p>
      ) : liveState?.authKind === "API_KEY" ? (
        <form
          className="mt-2 flex gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (apiKey.trim()) {
              runAction(() => saveApiKeyAction(liveState.integrationId, apiKey));
            }
          }}
        >
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={liveState.maskedCredential ? liveState.maskedCredential : "Paste API key"}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-soft px-2 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50"
          />
          <button
            type="submit"
            disabled={pending || !apiKey.trim()}
            className="rounded-lg bg-accent px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {liveState.maskedCredential ? "Replace" : "Save"}
          </button>
        </form>
      ) : (
        <p className="mt-2 truncate text-[11px] text-muted">
          {liveState?.accountLabel ??
            (liveState?.authKind === "NONE" ? "No credential required." : "Not connected.")}
        </p>
      )}

      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onViewUsage}
          className="rounded-lg bg-accent px-2 py-1 text-[11px] font-semibold text-white hover:bg-accent-dark"
        >
          Usage
        </button>
        {liveState?.authKind === "OAUTH" && !connected && liveState.connectUrl ? (
          <a
            href={liveState.connectUrl}
            className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-white/5"
          >
            Connect
          </a>
        ) : (
          <button
            type="button"
            onClick={() =>
              liveState && runAction(() => testIntegrationAction(liveState.integrationId))
            }
            disabled={pending || (!connected && liveState?.authKind !== "NONE" && !liveState?.sharedEnv)}
            className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-white/5 disabled:opacity-60"
          >
            Test
          </button>
        )}
        {connected && liveState?.integrationId === "youtube" ? (
          <a href="/dashboard/channels" className="px-1 text-[11px] font-semibold text-muted hover:text-foreground">
            Manage
          </a>
        ) : null}
        {connected &&
        liveState?.integrationId !== "youtube" &&
        liveState?.authKind !== "NONE" &&
        !liveState?.sharedEnv ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              liveState && runAction(() => removeCredentialAction(liveState.integrationId))
            }
            className="px-1 text-[11px] font-semibold text-muted hover:text-accent disabled:opacity-60"
          >
            Disconnect
          </button>
        ) : null}
        <a
          href={integration.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-[11px] font-semibold text-muted hover:text-foreground"
        >
          Docs
        </a>
      </div>
      {notice ? (
        <p
          role="status"
          className={`mt-2 rounded-md px-2 py-1 text-[11px] font-semibold ${
            notice.ok ? "bg-success/15 text-success" : "bg-accent/10 text-accent"
          }`}
        >
          {notice.text}
        </p>
      ) : null}
    </article>
  );
}
