"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import {
  FORMAT_LABELS,
  formatTimecode,
  projectDisplayName,
  selectedTitle,
  totalTimelineSeconds,
} from "@/lib/videoProject";

export function ExportButton({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const { project, dispatch } = useVideoProject();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const canExport = project.scenes.length > 0;
  const exported = Boolean(project.editor.exportedAt);
  const title = selectedTitle(project)?.text ?? projectDisplayName(project);
  const runtime = formatTimecode(totalTimelineSeconds(project.scenes));
  const resolution = project.summary.aspectRatio === "9:16" ? "1080×1920" : "1920×1080";

  async function onExport() {
    if (!canExport || busy) return;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* unsupported */
      }
    }
    setBusy(true);
    await new Promise((resolve) => {
      window.setTimeout(resolve, 1400);
    });
    dispatch({
      type: "UPDATE_EDITOR",
      patch: { exportedAt: new Date().toISOString() },
    });
    setBusy(false);
    setOpen(true);
  }

  return (
    <>
      <ActionButton
        size={size}
        className={className}
        disabled={!canExport}
        loading={busy}
        loadingLabel="Exporting…"
        onClick={onExport}
      >
        {exported ? "Export again" : "Export"}
      </ActionButton>
      <Modal
        open={open}
        title="Export ready"
        subtitle={title}
        onClose={() => setOpen(false)}
      >
        <p className="text-sm leading-relaxed text-muted">
          {FORMAT_LABELS[project.summary.format]} · {project.summary.aspectRatio} · {resolution} ·
          MP4 · {runtime}
        </p>
        <p className="mt-2 text-sm text-muted">
          Demo export — the Remotion file write isn’t wired yet. The cut is marked exported in this
          draft.
        </p>
        <div className="mt-4 flex justify-end">
          <ActionButton variant="secondary" onClick={() => setOpen(false)}>
            Done
          </ActionButton>
        </div>
      </Modal>
    </>
  );
}
