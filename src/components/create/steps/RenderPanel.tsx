"use client";

import { useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { LowEffortCheck } from "@/components/create/LowEffortCheck";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { ExportVoiceModal } from "@/components/create/ExportVoiceModal";
import { PublishToYoutube } from "@/components/create/PublishToYoutube";
import { exportProjectWithRemotion } from "@/lib/exportRemotion";
import { buildSceneVoiceovers, type ExportVoiceProvider } from "@/lib/exportVoiceover";
import { deriveReadiness, newId } from "@/lib/videoProject";
import { buildVideoMarkdown, videoMarkdownFileName } from "@/lib/videoMarkdown";

export function RenderPanel() {
  const { project, dispatch, setPreviewOpen, setActiveStep } = useVideoProject();
  const [busy, setBusy] = useState(false);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [renderedFile, setRenderedFile] = useState<{ blob: Blob; fileName: string; mimeType: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const items = deriveReadiness(project);
  const complete = items.filter((item) => item.complete).length;
  const hasTimeline = project.scenes.length > 0;
  const rendered = Boolean(project.renderedAt);

  async function render(provider: ExportVoiceProvider) {
    if (busy || !hasTimeline) return;
    setChooseOpen(false);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    setError(null);
    setProgress(0);

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
      const exported = await exportProjectWithRemotion(project, {
        signal: controller.signal,
        voiceoverUrls: voiceovers.bySceneId,
        voiceoverSeconds: voiceovers.seconds,
        onProgress: ({ progress: next }) => setProgress(next),
      });
      setRenderedFile({ blob: exported.blob, fileName: exported.fileName, mimeType: exported.mimeType });
      dispatch({ type: "MARK_RENDERED" });
      dispatch({
        type: "UPDATE_EDITOR",
        patch: { exportedAt: new Date().toISOString() },
      });
      dispatch({
        type: "RECORD_API_COST",
        entry: {
          id: newId(),
          at: new Date().toISOString(),
          step: "render",
          provider: "remotion",
          kind: "render",
          usd: 0,
        },
      });
      setPreviewOpen(true);
      setActiveStep("editor");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof Error
          ? err.message
          : "Render failed. Use Chrome or Firefox with WebCodecs.",
      );
    } finally {
      voiceovers?.revoke();
      setVoiceNote(null);
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      setProgress(0);
    }
  }

  function downloadVideoMarkdown() {
    const markdown = buildVideoMarkdown(project);
    dispatch({ type: "SET_VIDEO_MARKDOWN", markdown });
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = videoMarkdownFileName(project);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function onCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setProgress(0);
  }

  return (
    <div className="relative z-30 mb-24 rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-lg font-semibold text-foreground">Render</h3>
      <p className="mt-1 text-sm text-muted">
        Remotion encodes the cut in your browser (WebCodecs) and downloads an MP4. No server render
        queue.
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
          disabled={!hasTimeline || busy}
          loading={busy}
          loadingLabel={
            voiceNote ??
            (progress > 0 ? `Rendering ${Math.round(progress * 100)}%…` : "Rendering…")
          }
          onClick={() => setChooseOpen(true)}
        >
          {rendered ? "Re-render with Remotion" : "Render with Remotion"}
        </ActionButton>
        <ActionButton variant="secondary" onClick={downloadVideoMarkdown}>
          {project.videoMarkdown ? "Download video.md" : "Generate video.md"}
        </ActionButton>
        {busy ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-muted hover:text-foreground"
          >
            Cancel
          </button>
        ) : null}
        <LowEffortCheck scope="render" variant="button" />
        {rendered ? (
          <Badge tone="success">Rendered</Badge>
        ) : !hasTimeline ? (
          <p className="text-xs text-muted">Break the script into scenes first.</p>
        ) : complete < items.length ? (
          <p className="text-xs text-muted">Missing steps stay on the list — you can still render.</p>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
      <PublishToYoutube file={renderedFile} />
      <ExportVoiceModal
        open={chooseOpen}
        qwenName={project.qwenVoice.name}
        elevenName={project.elevenLabsVoice?.name ?? null}
        onClose={() => setChooseOpen(false)}
        onChoose={(provider) => void render(provider)}
      />
      <div className="mt-4">
        <LowEffortCheck scope="render" variant="report" />
      </div>
    </div>
  );
}
