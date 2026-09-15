"use client";

import { useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { exportProjectWithRemotion } from "@/lib/exportRemotion";
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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    setError(null);
    setProgress(0);
    setFileName(null);

    try {
      const result = await exportProjectWithRemotion(project, {
        signal: controller.signal,
        onProgress: ({ progress: next }) => setProgress(next),
      });
      dispatch({
        type: "UPDATE_EDITOR",
        patch: { exportedAt: new Date().toISOString() },
      });
      setFileName(result.fileName);
      setOpen(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error ? err.message : "Export failed. Try Chrome or Firefox.";
      setError(message);
      setOpen(true);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      setProgress(0);
    }
  }

  function onCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setProgress(0);
  }

  return (
    <>
      <div className={`inline-flex flex-col items-stretch gap-1 ${className}`}>
        <ActionButton
          size={size}
          disabled={!canExport || busy}
          loading={busy}
          loadingLabel={
            progress > 0 ? `Exporting ${Math.round(progress * 100)}%…` : "Exporting…"
          }
          onClick={onExport}
        >
          {exported ? "Export again" : "Export"}
        </ActionButton>
        {busy ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-semibold text-muted hover:text-foreground"
          >
            Cancel
          </button>
        ) : null}
      </div>
      <Modal
        open={open}
        title={error ? "Export failed" : "Export ready"}
        subtitle={title}
        onClose={() => setOpen(false)}
      >
        {error ? (
          <p className="text-sm leading-relaxed text-muted">{error}</p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              {FORMAT_LABELS[project.summary.format]} · {project.summary.aspectRatio} ·{" "}
              {resolution} · MP4 · {runtime}
            </p>
            <p className="mt-2 text-sm text-muted">
              Remotion finished encoding in the browser
              {fileName ? (
                <>
                  {" "}
                  and downloaded <span className="font-semibold text-foreground">{fileName}</span>
                </>
              ) : null}
              .
            </p>
          </>
        )}
        <div className="mt-4 flex justify-end">
          <ActionButton variant="secondary" onClick={() => setOpen(false)}>
            Done
          </ActionButton>
        </div>
      </Modal>
    </>
  );
}
