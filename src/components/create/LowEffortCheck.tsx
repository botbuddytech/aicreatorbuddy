"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { CursorPromptEditor } from "@/features/cursor-title-generator/CursorPromptEditor";
import type { CursorScriptLowEffortResult } from "@/features/cursor-script-analysis/contract";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import {
  canRunLowEffortCheck,
  lowEffortSourceHash,
} from "@/lib/lowEffortCheck";
import { lowEffortVerdictTone, type LowEffortStep, type LowEffortVerdict } from "@/lib/videoProject";

const VERDICT_LABEL: Record<LowEffortVerdict, string> = {
  pass: "Original enough",
  warn: "Risky",
  fail: "Likely low-effort",
};

const PANEL_TONE: Record<LowEffortVerdict, string> = {
  pass: "border-success/30 bg-success/5",
  warn: "border-chart-amber/30 bg-chart-amber/5",
  fail: "border-accent/30 bg-accent/5",
};

export function LowEffortCheckButton({ scope }: { scope: LowEffortStep }) {
  const { project, dispatch } = useVideoProject();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = canRunLowEffortCheck(project, scope);
  const cursorEnabled = process.env.NODE_ENV === "development";

  async function onCursorCheck() {
    if (!enabled || !cursorEnabled || busy || scope !== "script") return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/local/cursor-script-low-effort", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          script: project.fullScript,
          durationSeconds: project.summary.durationSeconds,
          references: project.summary.references.map((reference) => reference.transcript),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (CursorScriptLowEffortResult & { error?: string })
        | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error || "Cursor could not check the script.");
      }
      dispatch({
        type: "SET_LOW_EFFORT_REPORT",
        report: {
          checkedAt: new Date().toISOString(),
          scope: "script",
          provider: "cursor",
          sourceHash: lowEffortSourceHash(project, "script"),
          score: payload.score,
          verdict: payload.verdict,
          summary: payload.summary,
          findings: payload.findings,
        },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cursor could not check the script.");
    } finally {
      setBusy(false);
    }
  }

  if (scope !== "script") return null;

  return (
    <>
      <CursorPromptEditor kind="scriptLowEffort" enabled={cursorEnabled}>
        <ActionButton
          variant="secondary"
          onClick={onCursorCheck}
          disabled={!enabled || !cursorEnabled}
          loading={busy}
          loadingLabel="Checking…"
          className={cursorEnabled ? "rounded-r-none" : ""}
        >
          Check low-effort with Cursor
        </ActionButton>
      </CursorPromptEditor>
      {!cursorEnabled ? <span className="self-center text-xs text-muted">Local only</span> : null}
      {error ? <p className="basis-full text-xs text-accent">{error}</p> : null}
    </>
  );
}

export function LowEffortReport({ scope }: { scope: LowEffortStep }) {
  const { project } = useVideoProject();
  const report = project.lowEffortByStep?.[scope];
  if (!report || report.provider !== "cursor") return null;

  const stale = report.sourceHash !== lowEffortSourceHash(project, scope);
  const failCount = report.findings.filter((item) => item.severity === "fail").length;
  const warnCount = report.findings.filter((item) => item.severity === "warn").length;

  return (
    <div className={`rounded-2xl border p-5 ${PANEL_TONE[report.verdict]}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-display text-base font-semibold text-foreground">Low-effort check</h4>
          <p className="mt-1 text-xs text-muted">
            Cursor AI review for repetitious, reused, or thin-content risk — not YouTube’s
            classifier.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
            {report.score}
          </span>
          <Badge tone={lowEffortVerdictTone(report.verdict)}>{VERDICT_LABEL[report.verdict]}</Badge>
        </div>
      </div>
      {stale ? (
        <p className="mt-2 text-xs text-chart-amber">
          The draft changed since this scan — run the check again to refresh.
        </p>
      ) : report.findings.length === 0 ? (
        <p className="mt-2 text-xs text-muted">No low-effort patterns flagged on this pass.</p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          {failCount} fail · {warnCount} warn
        </p>
      )}
      {report.summary ? <p className="mt-3 text-sm text-foreground">{report.summary}</p> : null}
      {report.findings.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {report.findings.map((item, index) => (
            <li
              key={`${item.id}-${index}`}
              className="rounded-xl border border-border bg-surface-soft px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <Badge tone={item.severity === "fail" ? "accent" : "amber"}>
                  {item.severity === "fail" ? "Fail" : "Warn"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function LowEffortCheck({
  scope,
  variant = "full",
}: {
  scope: LowEffortStep;
  variant?: "button" | "report" | "full";
}) {
  if (variant === "button") return <LowEffortCheckButton scope={scope} />;
  if (variant === "report") return <LowEffortReport scope={scope} />;
  return (
    <div className="space-y-3">
      <LowEffortCheckButton scope={scope} />
      <LowEffortReport scope={scope} />
    </div>
  );
}
