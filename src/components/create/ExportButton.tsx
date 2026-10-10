"use client";

import { useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { ExportVoiceModal } from "@/components/create/ExportVoiceModal";
import { exportProjectWithRemotion } from "@/lib/exportRemotion";
import { buildSceneVoiceovers, type ExportVoiceProvider } from "@/lib/exportVoiceover";
import { trackSessionEvent } from "@/lib/session/telemetry";
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
  const [chooseOpen, setChooseOpen] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [voiceLabel, setVoiceLabel] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const exportRef = useRef<{ id: string; attempt: number; startedAt: string } | null>(null);
  const attemptRef = useRef(0);

  const canExport = project.scenes.length > 0;
  const exported = Boolean(project.editor.exportedAt);
  const title = selectedTitle(project)?.text ?? projectDisplayName(project);
  const runtime = formatTimecode(totalTimelineSeconds(project.scenes));
  const resolution = project.summary.aspectRatio === "9:16" ? "1080×1920" : "1920×1080";

  async function openChooser() {
    if (!canExport || busy) return;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* unsupported */
      }
    }
    setChooseOpen(true);
  }

  async function onExport(provider: ExportVoiceProvider) {
    if (!canExport || busy) return;
    setChooseOpen(false);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    setError(null);
    setProgress(0);
    setFileName(null);
    setVoiceNote(null);
    const spokenWith =
      provider === "qwen"
        ? `Qwen (${project.qwenVoice.name})`
        : `ElevenLabs (${project.elevenLabsVoice?.name ?? "voice"})`;
    setVoiceLabel(spokenWith);
    const exportRun = {
      id: crypto.randomUUID(),
      attempt: ++attemptRef.current,
      startedAt: new Date().toISOString(),
    };
    exportRef.current = exportRun;
    const exportPayload = {
      exportId: exportRun.id,
      attempt: exportRun.attempt,
      startedAt: exportRun.startedAt,
      format: project.summary.format,
      aspectRatio: project.summary.aspectRatio,
      resolution,
      runtimeSec: totalTimelineSeconds(project.scenes),
      sceneCount: project.scenes.length,
    };
    trackSessionEvent(project.id, {
      type: "export.started",
      step: "editor",
      payload: exportPayload,
    });

    let voiceovers: Awaited<ReturnType<typeof buildSceneVoiceovers>> | null = null;
    try {
      voiceovers = await buildSceneVoiceovers(project, provider, {
        signal: controller.signal,
        onScene: (done, total, label) => setVoiceNote(`Speaking ${done} of ${total} · ${label}`),
      });
      setVoiceNote(null);
      dispatch({
        type: "SET_SCENES",
        scenes: project.scenes.map((scene) => {
          const length = voiceovers?.seconds[scene.id];
          if (!length) return scene;
          return { ...scene, editing: { ...scene.editing, voiceSeconds: length } };
        }),
        keepStatus: true,
      });
      const result = await exportProjectWithRemotion(project, {
        signal: controller.signal,
        voiceoverUrls: voiceovers.bySceneId,
        voiceoverSeconds: voiceovers.seconds,
        onProgress: ({ progress: next }) => setProgress(next),
      });
      dispatch({
        type: "UPDATE_EDITOR",
        patch: {
          exportedAt: new Date().toISOString(),
          exportCount: project.editor.exportCount + 1,
        },
      });
      trackSessionEvent(project.id, {
        type: "export.succeeded",
        step: "editor",
        payload: {
          ...exportPayload,
          fileName: result.fileName,
          durationMs: Date.now() - new Date(exportRun.startedAt).getTime(),
        },
      });
      setFileName(result.fileName);
      setOpen(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error ? err.message : "Export failed. Try Chrome or Firefox.";
      trackSessionEvent(project.id, {
        type: "export.failed",
        step: "editor",
        payload: {
          ...exportPayload,
          errorMessage: message,
          durationMs: Date.now() - new Date(exportRun.startedAt).getTime(),
        },
      });
      setError(message);
      setOpen(true);
    } finally {
      voiceovers?.revoke();
      setVoiceNote(null);
      if (abortRef.current === controller) abortRef.current = null;
      if (exportRef.current?.id === exportRun.id) exportRef.current = null;
      setBusy(false);
      setProgress(0);
    }
  }

  function onCancel() {
    const active = exportRef.current;
    if (active) {
      trackSessionEvent(project.id, {
        type: "export.cancelled",
        step: "editor",
        payload: {
          exportId: active.id,
          attempt: active.attempt,
          startedAt: active.startedAt,
          format: project.summary.format,
          aspectRatio: project.summary.aspectRatio,
          resolution,
          runtimeSec: totalTimelineSeconds(project.scenes),
          sceneCount: project.scenes.length,
          durationMs: Date.now() - new Date(active.startedAt).getTime(),
        },
      });
      exportRef.current = null;
    }
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
            voiceNote ??
            (progress > 0 ? `Exporting ${Math.round(progress * 100)}%…` : "Exporting…")
          }
          onClick={() => void openChooser()}
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
      <ExportVoiceModal
        open={chooseOpen}
        qwenName={project.qwenVoice.name}
        elevenName={project.elevenLabsVoice?.name ?? null}
        onClose={() => setChooseOpen(false)}
        onChoose={(provider) => void onExport(provider)}
      />
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
              Spoken with {voiceLabel ?? "the selected voice"}. Remotion finished encoding in the browser
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
