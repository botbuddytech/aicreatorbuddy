"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { ExportVoiceModal } from "@/components/create/ExportVoiceModal";
import { Topbar } from "@/components/dashboard/Topbar";
import { ChannelAvatar } from "@/components/dashboard/ChannelCard";
import { ScheduleApprovalModal } from "@/components/dashboard/scheduler/ScheduleApprovalModal";
import { ScheduleExportProgressModal } from "@/components/dashboard/scheduler/ScheduleExportProgressModal";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import type { ScheduleCandidate } from "@/lib/scheduler/candidates";
import { pickUploadChannelId } from "@/lib/scheduler/pickUploadChannel";
import {
  fetchSessionProject,
  renderSessionProject,
} from "@/lib/scheduler/renderSessionProject";
import { saveApprovedMeta } from "@/lib/scheduler/scheduleApprovedMeta";
import { patchScheduleJob, writeScheduleJob } from "@/lib/scheduler/scheduleJob";
import type { ExportVoiceProvider } from "@/lib/exportVoiceover";
import { clearPendingScheduleUpload, setPendingScheduleUpload } from "@/lib/scheduler/schedulePendingUpload";
import { flushSessionEvents, trackSessionEvent } from "@/lib/session/telemetry";
import { projectPublishTitle, projectThumbnailUrl } from "@/lib/youtube/publishClient";
import type { ConnectedChannel } from "@/lib/youtube/repo";
import { totalTimelineSeconds, type VideoProject } from "@/lib/videoProject";

const YOUTUBE_SCHEDULE_BUFFER_MS = 15 * 60 * 1000;
const AUTO_PREPARE_DEBOUNCE_MS = 450;

function relativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.round(delta / 60000);
  if (Number.isNaN(mins) || mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

function displayName(candidate: ScheduleCandidate): string {
  const name = candidate.name.trim();
  if (name) return name;
  const topic = candidate.topic.trim();
  if (topic) return topic;
  return "Untitled project";
}

function minScheduleLocalValue(): string {
  const d = new Date(Date.now() + YOUTUBE_SCHEDULE_BUFFER_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function validatePublishLocal(publishAtLocal: string): string | null {
  if (!publishAtLocal) return "Choose a publish date and time.";
  const when = new Date(publishAtLocal);
  if (Number.isNaN(when.getTime())) return "Choose a valid date and time.";
  if (when.getTime() < Date.now() + YOUTUBE_SCHEDULE_BUFFER_MS) {
    return "YouTube needs at least ~15 minutes before the publish time.";
  }
  return null;
}

export function ScheduleVideoWizard({
  candidates,
  channels,
  activeChannelId,
  initialSessionId = null,
  initialPublishAtIso = null,
}: {
  candidates: ScheduleCandidate[];
  channels: ConnectedChannel[];
  activeChannelId: string | null;
  initialSessionId?: string | null;
  initialPublishAtIso?: string | null;
}) {
  const router = useRouter();
  const [selectedChannelId, setSelectedChannelId] = useState(
    () => pickUploadChannelId({ activeChannelId, channels }) ?? "",
  );
  const selectedChannel =
    channels.find((item) => item.id === selectedChannelId) ??
    channels.find((item) => item.id === activeChannelId) ??
    channels.find((item) => item.status === "ACTIVE") ??
    channels[0] ??
    null;
  const [selectedId, setSelectedId] = useState(() => {
    if (initialSessionId && candidates.some((c) => c.id === initialSessionId)) return initialSessionId;
    return candidates[0]?.id ?? "";
  });
  const [publishAtLocal, setPublishAtLocal] = useState(() => {
    if (!initialPublishAtIso) return "";
    const d = new Date(initialPublishAtIso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [voiceOpen, setVoiceOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState("Starting…");
  const [exportProgress, setExportProgress] = useState(0);

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [project, setProject] = useState<VideoProject | null>(null);
  const [renderedFile, setRenderedFile] = useState<{ blob: Blob; fileName: string; mimeType: string } | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [publishAtIso, setPublishAtIso] = useState("");
  const [approveBusy, setApproveBusy] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const prepareKeyRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const [exporting, setExporting] = useState(false);

  const minSchedule = useMemo(() => minScheduleLocalValue(), []);

  const channelBlocked = channels.length === 0;
  const needsReauth = selectedChannel != null && selectedChannel.status !== "ACTIVE";

  const resetPreview = useCallback(() => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setRenderedFile(null);
    setProject(null);
    setApprovalOpen(false);
  }, [videoPreviewUrl]);

  const runExport = useCallback(
    async (sessionId: string, provider: ExportVoiceProvider, publishIso: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      busyRef.current = true;
      setExporting(true);
      setExportOpen(true);
      setExportProgress(0);
      setExportMessage("Loading project…");
      setScheduleError(null);
      resetPreview();

      const candidate = candidates.find((c) => c.id === sessionId);
      const titleLabel = candidate ? displayName(candidate) : "Video";
      writeScheduleJob({
        sessionId,
        title: titleLabel,
        publishAtIso: publishIso,
        phase: "rendering",
        progress: 0,
        message: "Loading project…",
        updatedAt: new Date().toISOString(),
      });

      try {
        let loaded = await fetchSessionProject(sessionId);
        const channelId = pickUploadChannelId({
          selectedChannelId,
          projectChannelId: loaded.channelId,
          activeChannelId,
          channels,
        });
        if (!channelId) {
          throw new Error("Connect a YouTube channel in Channels before scheduling.");
        }
        loaded = { ...loaded, channelId };
        setProject(loaded);

        const exported = await renderSessionProject(loaded, provider, {
          signal: controller.signal,
          onProgress: (progress, message) => {
            setExportProgress(progress);
            setExportMessage(message);
            patchScheduleJob({ progress, message, phase: "rendering" });
          },
        });

        const url = URL.createObjectURL(exported.blob);
        setRenderedFile({
          blob: exported.blob,
          fileName: exported.fileName,
          mimeType: exported.mimeType,
        });
        setVideoPreviewUrl(url);
        setPublishAtIso(publishIso);
        trackSessionEvent(loaded.id, {
          type: "export.succeeded",
          step: "render",
          payload: {
            exportId: crypto.randomUUID(),
            attempt: loaded.editor.exportCount + 1,
            startedAt: new Date().toISOString(),
            fileName: exported.fileName,
            format: loaded.summary.format,
            aspectRatio: loaded.summary.aspectRatio,
            resolution: loaded.summary.aspectRatio === "9:16" ? "1080×1920" : "1920×1080",
            runtimeSec: totalTimelineSeconds(loaded.scenes),
            sceneCount: loaded.scenes.length,
            source: "scheduler",
          },
        });
        void flushSessionEvents(loaded.id);
        setExportOpen(false);
        setApprovalOpen(true);
        patchScheduleJob({
          phase: "review",
          progress: 1,
          message: "Review before upload",
          title: projectPublishTitle(loaded),
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Export failed.";
        setScheduleError(message);
        setExportOpen(false);
        writeScheduleJob({
          sessionId,
          title: titleLabel,
          publishAtIso: publishIso,
          phase: "failed",
          progress: 0,
          message,
          error: message,
          updatedAt: new Date().toISOString(),
        });
        prepareKeyRef.current = null;
      } finally {
        busyRef.current = false;
        setExporting(false);
      }
    },
    [activeChannelId, channels, candidates, resetPreview, selectedChannelId],
  );

  const queuePrepare = useCallback(() => {
    if (channelBlocked || needsReauth || !selectedId) return;
    const validation = validatePublishLocal(publishAtLocal);
    if (validation) {
      setScheduleError(validation);
      return;
    }
    const publishIso = new Date(publishAtLocal).toISOString();
    const key = `${selectedId}:${publishIso}`;
    if (busyRef.current || prepareKeyRef.current === key) return;
    prepareKeyRef.current = key;
    void fetchSessionProject(selectedId)
      .then((loaded) => setProject(loaded))
      .catch(() => {
        /* voice labels fall back until export loads project */
      });
    setVoiceOpen(true);
  }, [channelBlocked, needsReauth, publishAtLocal, selectedId]);

  useEffect(() => {
    if (channelBlocked || needsReauth || !selectedId || !publishAtLocal) return;
    if (validatePublishLocal(publishAtLocal)) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      queuePrepare();
    }, AUTO_PREPARE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [channelBlocked, needsReauth, publishAtLocal, selectedId, queuePrepare]);

  async function onVoiceChosen(provider: ExportVoiceProvider) {
    setVoiceOpen(false);
    if (!selectedId || !publishAtLocal) return;
    const publishIso = new Date(publishAtLocal).toISOString();
    await runExport(selectedId, provider, publishIso);
  }

  function onApprove() {
    if (!project || !renderedFile || !publishAtIso) return;
    const channelId = pickUploadChannelId({
      selectedChannelId,
      projectChannelId: project.channelId,
      activeChannelId,
      channels,
    });
    if (!channelId) {
      setApproveError("Connect a YouTube channel in Channels before scheduling.");
      return;
    }
    setApproveBusy(true);
    setApproveError(null);

    const title = projectPublishTitle(project);
    setPendingScheduleUpload({
      sessionId: project.id,
      channelId,
      title,
      description: project.description,
      tags: project.tags,
      publishAtIso,
      thumbnailUrl: projectThumbnailUrl(project),
      file: renderedFile,
    });
    saveApprovedMeta({
      sessionId: project.id,
      channelId,
      title,
      description: project.description,
      tags: project.tags,
      publishAtIso,
      thumbnailUrl: projectThumbnailUrl(project),
      approvedAt: new Date().toISOString(),
    });
    writeScheduleJob({
      sessionId: project.id,
      title,
      publishAtIso,
      channelId,
      phase: "approved",
      progress: 0,
      message: "Approved — upload on Upcoming",
      updatedAt: new Date().toISOString(),
    });
    setApprovalOpen(false);
    setApproveBusy(false);
    router.push("/dashboard/videoscheduler/upcoming");
  }

  function onCloseApproval() {
    if (approveBusy) return;
    setApprovalOpen(false);
    prepareKeyRef.current = null;
    if (project?.id) clearPendingScheduleUpload(project.id);
    writeScheduleJob(null);
  }

  const qwenName = project?.qwenVoice.name ?? "Default";
  const elevenName = project?.elevenLabsVoice?.name ?? null;

  return (
    <>
      <Topbar
        title="Video Scheduler"
        subtitle={
          selectedChannel
            ? `Uploads go to ${selectedChannel.title}`
            : "Connect YouTube to schedule uploads"
        }
        actions={
          <Link
            href="/dashboard/videoscheduler"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-soft"
          >
            Back to calendar
          </Link>
        }
      />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {channelBlocked ? (
          <EmptyState
            title="Connect a YouTube channel"
            description="Scheduling uploads requires an active channel connection with upload access."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/api/youtube/connect"
                  className="inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
                >
                  Connect YouTube
                </a>
                <Link href="/dashboard/channels" className="text-sm font-semibold text-accent hover:text-accent-dark">
                  Manage channels
                </Link>
              </div>
            }
          />
        ) : null}

        {!channelBlocked && needsReauth && selectedChannel ? (
          <div className="rounded-xl border border-chart-amber/40 bg-chart-amber/10 px-4 py-3 text-sm text-foreground">
            <p className="font-semibold">Reconnect {selectedChannel.title}</p>
            <p className="mt-1 text-muted">YouTube upload is paused until you sign in again.</p>
            <a href="/api/youtube/connect" className="mt-2 inline-block text-sm font-semibold text-accent hover:text-accent-dark">
              Reconnect channel
            </a>
          </div>
        ) : null}

        {!channelBlocked && selectedChannel ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
            <ChannelAvatar channel={selectedChannel} />
            <div className="min-w-0 flex-1">
              <label htmlFor="schedule-channel" className="text-sm font-semibold text-foreground">
                YouTube channel
              </label>
              <p className="text-xs text-muted">The video is uploaded to this connected channel.</p>
              <select
                id="schedule-channel"
                value={selectedChannel.id}
                onChange={(event) => {
                  setSelectedChannelId(event.target.value);
                  prepareKeyRef.current = null;
                }}
                className="mt-2 w-full max-w-sm rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground"
              >
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id} disabled={channel.status !== "ACTIVE"}>
                    {channel.title}
                    {channel.status !== "ACTIVE" ? " (reconnect)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {!channelBlocked ? (
          <>
            <div className="rounded-xl border border-border bg-surface p-4">
              <label className="text-sm font-semibold text-foreground">Publish time</label>
              <p className="mt-1 text-xs text-muted">
                After you choose a time (and a project below), export starts automatically. You will review title,
                thumbnail, and description before anything goes to YouTube.
              </p>
              <input
                type="datetime-local"
                min={minSchedule}
                value={publishAtLocal}
                onChange={(event) => {
                  setPublishAtLocal(event.target.value);
                  setScheduleError(null);
                  prepareKeyRef.current = null;
                }}
                className="mt-3 w-full max-w-sm rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground"
              />
              {scheduleError ? <p className="mt-2 text-sm text-accent">{scheduleError}</p> : null}
            </div>

            {candidates.length === 0 ? (
              <EmptyState
                title="No projects to schedule"
                description="Create a video project first, or open one that has not been published to YouTube yet."
                action={
                  <Link
                    href="/dashboard/create"
                    className="inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
                  >
                    Create new video
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-base font-semibold text-foreground">Choose a project</h2>
                  <Link href="/dashboard/create" className="text-sm font-semibold text-accent hover:text-accent-dark">
                    Create new video
                  </Link>
                </div>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                  {candidates.map((candidate) => {
                    const selected = candidate.id === selectedId;
                    const label = displayName(candidate);
                    return (
                      <li key={candidate.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(candidate.id);
                            prepareKeyRef.current = null;
                          }}
                          className={`flex w-full gap-3 p-3 text-left transition-colors hover:bg-surface-soft ${
                            selected ? "bg-accent/5 ring-1 ring-inset ring-accent/30" : ""
                          }`}
                        >
                          <span className="relative block h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-soft">
                            <PlaceholderImage label={label} hideLabel className="h-full w-full" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-display line-clamp-1 text-sm font-semibold text-foreground">
                                {label}
                              </span>
                              <Badge tone={candidate.readyToSchedule ? "success" : "amber"} size="sm">
                                {candidate.readyToSchedule ? "Has prior export" : "Will export now"}
                              </Badge>
                            </span>
                            <span className="mt-1 block text-xs text-muted">
                              {selectedChannel?.title ?? "Selected channel"}{" "}
                              · updated {relativeTime(candidate.lastActiveAt)}
                            </span>
                          </span>
                          <span
                            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selected ? "border-accent bg-accent" : "border-border"
                            }`}
                            aria-hidden
                          >
                            {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <ActionButton
                  type="button"
                  disabled={!selectedId || !publishAtLocal || needsReauth || exporting}
                  onClick={() => queuePrepare()}
                >
                  Export &amp; review again
                </ActionButton>
              </div>
            )}
          </>
        ) : null}
      </div>

      <ExportVoiceModal
        open={voiceOpen}
        qwenName={qwenName}
        elevenName={elevenName}
        onClose={() => {
          setVoiceOpen(false);
          prepareKeyRef.current = null;
        }}
        onChoose={(provider) => void onVoiceChosen(provider)}
      />

      <ScheduleExportProgressModal
        open={exportOpen}
        title="Exporting your video"
        message={exportMessage}
        progress={exportProgress}
      />

      {project && renderedFile && videoPreviewUrl ? (
        <ScheduleApprovalModal
          open={approvalOpen}
          project={project}
          publishAtIso={publishAtIso}
          channelTitle={selectedChannel?.title ?? "Connected channel"}
          videoUrl={videoPreviewUrl}
          fileName={renderedFile.fileName}
          busy={approveBusy}
          error={approveError}
          onClose={onCloseApproval}
          onApprove={() => void onApprove()}
        />
      ) : null}
    </>
  );
}
