"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { LowEffortCheck } from "@/components/create/LowEffortCheck";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { deriveReadiness, newId } from "@/lib/videoProject";

export function RenderPanel() {
  const { project, dispatch, setPreviewOpen, setActiveStep } = useVideoProject();
  const [busy, setBusy] = useState(false);
  const items = deriveReadiness(project);
  const complete = items.filter((item) => item.complete).length;
  const hasTimeline = project.scenes.length > 0;
  const rendered = Boolean(project.renderedAt);

  async function render() {
    if (busy || !hasTimeline) return;
    setBusy(true);
    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1400);
      });
      dispatch({ type: "MARK_RENDERED" });
      dispatch({
        type: "RECORD_API_COST",
        entry: {
          id: newId(),
          at: new Date().toISOString(),
          step: "render",
          provider: "remotion",
          kind: "render",
          usd: 0.12,
        },
      });
      setPreviewOpen(true);
      setActiveStep("editor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-30 mb-24 rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-lg font-semibold text-foreground">Render</h3>
      <p className="mt-1 text-sm text-muted">
        Checklist of what Remotion will need. When the render finishes, the center preview turns
        green and the Editor opens.
      </p>
      <p className="mt-3 text-sm text-muted">
        {complete} / {items.length} ready
      </p>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-border bg-surface-soft px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted">{item.detail}</p>
            </div>
            <Badge tone={item.complete ? "success" : "muted"}>
              {item.complete ? "Ready" : "Missing"}
            </Badge>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ActionButton
          onClick={render}
          disabled={!hasTimeline}
          loading={busy}
          loadingLabel="Rendering…"
        >
          {rendered ? "Re-render with Remotion" : "Render with Remotion"}
        </ActionButton>
        <LowEffortCheck scope="render" variant="button" />
        {rendered ? (
          <Badge tone="success">Rendered</Badge>
        ) : !hasTimeline ? (
          <p className="text-xs text-muted">Break the script into scenes first.</p>
        ) : complete < items.length ? (
          <p className="text-xs text-muted">Missing steps stay on the list — you can still render.</p>
        ) : null}
      </div>
      <div className="mt-4">
        <LowEffortCheck scope="render" variant="report" />
      </div>
    </div>
  );
}
