"use client";

import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EditorWorkspace } from "@/components/create/editor/EditorWorkspace";
import { ExportButton } from "@/components/create/ExportButton";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { formatTimecode, totalTimelineSeconds } from "@/lib/videoProject";

export function EditorStep() {
  const { project, dispatch, setActiveStep } = useVideoProject();
  const confirmed = Boolean(project.editor.confirmedAt);
  const runtime = totalTimelineSeconds(project.scenes);

  if (!project.renderedAt) {
    return (
      <EmptyState
        title="Render first"
        description="The editor unlocks after Remotion finishes a cut. Complete the checklist on Render, then come back here."
        action={
          <ActionButton onClick={() => setActiveStep("render")}>Go to Render</ActionButton>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-surface p-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Editor</h3>
          <p className="mt-1 text-sm text-muted">
            Trim clips, pick assets, set transitions and audio, then confirm the cut.
          </p>
          <p className="mt-2 text-xs tabular-nums text-muted">
            {project.scenes.length} clips · {formatTimecode(runtime)} runtime
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {confirmed ? <Badge tone="success">Confirmed</Badge> : null}
          <ExportButton />
          <ActionButton
            variant={confirmed ? "secondary" : "primary"}
            onClick={() => dispatch({ type: "CONFIRM_EDIT" })}
          >
            {confirmed ? "Confirmed" : "Confirm edit"}
          </ActionButton>
        </div>
      </div>
      <EditorWorkspace />
    </div>
  );
}
