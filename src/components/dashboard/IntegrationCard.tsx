"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MiniSparkline } from "@/components/dashboard/UsageTrendChart";
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
  formatUsd,
  quotaPercent,
  type Integration,
} from "@/lib/dashboardContent";
import type { UserIntegrationState } from "@/lib/integrations/repo";

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
  const barColor =
    percent >= 90 ? "bg-accent" : percent >= 75 ? "bg-chart-amber" : "bg-success";
  const sparkline = integration.trend.slice(-14);
  const isVidiq = liveState?.integrationId === "vidiq";
  const hasVidiqTrend = Boolean(liveState?.usage?.trend.some((value) => value > 0));
  const callsToday = isVidiq
    ? liveState.usage?.callsToday
    : (integration.trend[integration.trend.length - 1] ?? 0);
  const spendMonth = isVidiq
    ? liveState.usage?.spendMonthUsd
    : integration.cost.monthToDate;
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
    <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white ${integration.color}`}
          >
            {integration.initials}
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              {integration.name}
            </h3>
            <p className="text-xs text-muted">{integration.category}</p>
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
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            liveState?.enabled ? "bg-success" : "bg-white/10"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              liveState?.enabled ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${INTEGRATION_STATUS_PILL[displayStatus]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${INTEGRATION_STATUS_DOT[displayStatus]}`} />
          {statusLabel}
        </span>
        <span className="text-xs text-muted">
          Last used {isVidiq && !liveState.lastUsedAt ? "—" : integration.lastUsed}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{integration.description}</p>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted">Quota</span>
          <span className="font-medium text-foreground">
            {isVidiq && !liveState.quotaLimit ? (
              "—"
            ) : (
              <>
                {isVidiq
                  ? `${formatInt(integration.quota.used)} / ${formatInt(integration.quota.limit)}`
                  : `${formatCount(integration.quota.used)} / ${formatCount(integration.quota.limit)}`}{" "}
                {integration.quota.unit}
              </>
            )}
          </span>
        </div>
        {!isVidiq || liveState.quotaLimit ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-soft">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3 py-2">
        <div>
          <p className="text-[11px] text-muted">Calls today</p>
          <p className="font-display text-sm font-semibold text-foreground">
            {callsToday == null ? "—" : formatInt(callsToday)}
          </p>
        </div>
        {!isVidiq || hasVidiqTrend ? (
          <MiniSparkline values={sparkline} className="h-7 w-20 text-accent" />
        ) : null}
        <div className="text-right">
          <p className="text-[11px] text-muted">Spend MTD</p>
          <p className="font-display text-sm font-semibold text-foreground">
            {spendMonth == null ? "—" : formatUsd(spendMonth)}
          </p>
        </div>
      </div>

      {liveState?.authKind === "API_KEY" ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (apiKey.trim()) {
              runAction(() => saveApiKeyAction(liveState.integrationId, apiKey));
            }
          }}
        >
          {liveState.maskedCredential ? (
            <code className="block truncate rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs text-foreground">
              {liveState.maskedCredential}
            </code>
          ) : null}
          <div className="flex gap-2">
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={
                liveState.maskedCredential
                  ? "Paste replacement key"
                  : `${liveState.keyPrefix ?? ""}Paste API key`
              }
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50"
            />
            <button
              type="submit"
              disabled={pending || !apiKey.trim()}
              className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {liveState.maskedCredential ? "Replace" : "Save"}
            </button>
          </div>
          <p className="text-[11px] text-muted">
            Encrypted at rest. Saved keys cannot be revealed or copied back.
          </p>
        </form>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-surface-soft px-3 py-2 text-xs text-muted">
          {liveState?.accountLabel ??
            (liveState?.authKind === "NONE"
              ? "Runs locally; no credential required."
              : "No account connected.")}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onViewUsage}
          className="flex-1 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          View usage
        </button>
        {liveState?.authKind === "OAUTH" && !connected && liveState.connectUrl ? (
          <a
            href={liveState.connectUrl}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-white/5"
          >
            Connect
          </a>
        ) : (
          <button
            type="button"
            onClick={() =>
              liveState &&
              runAction(() => testIntegrationAction(liveState.integrationId))
            }
            disabled={pending || (!connected && liveState?.authKind !== "NONE")}
            className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-white/5 disabled:opacity-60"
          >
            {pending ? "Working…" : "Test connection"}
          </button>
        )}
        {connected && liveState?.integrationId === "youtube" ? (
          <a
            href="/dashboard/channels"
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-foreground"
          >
            Manage
          </a>
        ) : null}
        {connected && liveState?.integrationId !== "youtube" && liveState?.authKind !== "NONE" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              liveState &&
              runAction(() => removeCredentialAction(liveState.integrationId))
            }
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-accent disabled:opacity-60"
          >
            Disconnect
          </button>
        ) : null}
        <a
          href={integration.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-foreground"
        >
          Docs
        </a>
      </div>
      {notice ? (
        <p
          role="status"
          className={`mt-3 rounded-lg px-2.5 py-2 text-xs font-semibold ${
            notice.ok ? "bg-success/15 text-success" : "bg-accent/10 text-accent"
          }`}
        >
          {notice.text}
        </p>
      ) : null}
    </article>
  );
}
