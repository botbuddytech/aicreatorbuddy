"use client";

import { useState } from "react";
import { MiniSparkline } from "@/components/dashboard/UsageTrendChart";
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

export function IntegrationCard({
  integration,
  onViewUsage,
}: {
  integration: Integration;
  onViewUsage: () => void;
}) {
  const [connected, setConnected] = useState(integration.connected);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | null>(null);

  const displayStatus = !connected
    ? "disconnected"
    : integration.status === "disconnected"
      ? "operational"
      : integration.status;
  const percent = quotaPercent(integration.quota);
  const barColor =
    percent >= 90 ? "bg-accent" : percent >= 75 ? "bg-chart-amber" : "bg-success";
  const sparkline = integration.trend.slice(-14);
  const callsToday = integration.trend[integration.trend.length - 1] ?? 0;
  const keyValue = revealed
    ? integration.revealedKey || integration.maskedKey.replace(/•/g, "x")
    : integration.maskedKey;

  function toggleConnect() {
    setConnected((value) => !value);
    setTestResult(null);
  }

  function testConnection() {
    setTesting(true);
    setTestResult(null);
    window.setTimeout(() => {
      setTesting(false);
      setTestResult("ok");
      setConnected(true);
    }, 800);
  }

  async function copyKey() {
    const value = integration.revealedKey || integration.maskedKey;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
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
          aria-checked={connected}
          onClick={toggleConnect}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            connected ? "bg-success" : "bg-white/10"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              connected ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${INTEGRATION_STATUS_PILL[displayStatus]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${INTEGRATION_STATUS_DOT[displayStatus]}`} />
          {INTEGRATION_STATUS_LABEL[displayStatus]}
        </span>
        <span className="text-xs text-muted">Last used {integration.lastUsed}</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{integration.description}</p>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted">Quota</span>
          <span className="font-medium text-foreground">
            {formatCount(integration.quota.used)} / {formatCount(integration.quota.limit)}{" "}
            {integration.quota.unit}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-soft">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3 py-2">
        <div>
          <p className="text-[11px] text-muted">Calls today</p>
          <p className="font-display text-sm font-semibold text-foreground">{formatInt(callsToday)}</p>
        </div>
        <MiniSparkline values={sparkline} className="h-7 w-20 text-accent" />
        <div className="text-right">
          <p className="text-[11px] text-muted">Spend MTD</p>
          <p className="font-display text-sm font-semibold text-foreground">
            {formatUsd(integration.cost.monthToDate)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-2">
        <code className="flex-1 truncate text-xs text-foreground">{keyValue}</code>
        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          className="text-xs font-semibold text-accent hover:text-accent-dark"
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
        <button
          type="button"
          onClick={copyKey}
          className="text-xs font-semibold text-muted hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onViewUsage}
          className="flex-1 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          View usage
        </button>
        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-white/5 disabled:opacity-60"
        >
          {testing ? "Testing…" : "Test connection"}
        </button>
        <a
          href={integration.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-foreground"
        >
          Docs
        </a>
        {testResult === "ok" ? (
          <span className="rounded-lg bg-success/15 px-2.5 py-2 text-xs font-semibold text-success">
            Connected
          </span>
        ) : null}
      </div>
    </article>
  );
}
