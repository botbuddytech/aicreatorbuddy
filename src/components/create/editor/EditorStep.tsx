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

  if (project.scenes.length === 0) {
    return (
      <EmptyState
        title="Build the timeline first"
        description="The editor opens once the timeline has clips. You can render the MP4 later."
        action={
          <ActionButton onClick={() => setActiveStep("timeline")}>Go to Timeline</ActionButton>
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
            Remotion preview and export: official scene transitions, Studio-style timeline zoom, and
            keyboard transport (Space/K, J/L). Text, transitions, audio, then confirm.
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
