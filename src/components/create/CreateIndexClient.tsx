"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { AgentLayout } from "@/components/agent/AgentLayout";
import { AgentToggle } from "@/components/agent/AgentToggle";
import { Topbar } from "@/components/dashboard/Topbar";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { VideoGridSkeleton } from "@/components/ui/skeletons/VideoGridSkeleton";
import { useProjectStore } from "@/lib/useVideoProjectDraft";
import {
  deriveReadiness,
  formatDurationLabel,
  projectDisplayName,
  stepStatusLabel,
  stepStatusTone,
  type VideoProject,
} from "@/lib/videoProject";
import type { ConnectedChannel } from "@/lib/youtube/repo";

const CREATE_VIEW_KEY = "aicb-create-view";

type CreateViewMode = "cards" | "list";

function relativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.round(delta / 60000);
  if (Number.isNaN(mins) || mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

function projectThumbnailUrl(project: VideoProject): string | null {
  const chosen = project.thumbnails.find((item) => item.id === project.selectedThumbnailId);
  const url = (chosen?.customUrl ?? project.thumbnails.find((item) => item.customUrl)?.customUrl)?.trim();
  if (!url) return null;
  if (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("/") ||
    url.startsWith("data:image/")
  ) {
    return url;
  }
  return null;
}

function projectProgress(project: VideoProject) {
  const items = deriveReadiness(project);
  const ready = items.filter((item) => item.complete).length;
  const pct = items.length === 0 ? 0 : Math.round((ready / items.length) * 100);
  const approved = Object.values(project.stepStatus).filter((status) => status === "approved").length;
  return { ready, total: items.length, pct, approved };
}

function ProjectThumb({
  project,
  className,
}: {
  project: VideoProject;
  className: string;
}) {
  const url = projectThumbnailUrl(project);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={`object-cover ${className}`} />
    );
  }
  return (
    <PlaceholderImage
      label={projectDisplayName(project)}
      hideLabel
      className={className}
    />
  );
}

function DurationBadge({ project }: { project: VideoProject }) {
  return (
    <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {formatDurationLabel(project.summary.durationSeconds, project.summary.format)}
    </span>
  );
}

function ReadinessBar({ pct, ready, total }: { pct: number; ready: number; total: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
        <span>Readiness</span>
        <span>
          {ready}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProjectActions({
  project,
  onDuplicate,
  onDelete,
  compact = false,
}: {
  project: VideoProject;
  onDuplicate: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex shrink-0 flex-wrap items-center gap-2" : "flex flex-wrap gap-2"}>
      <Link
        href={`/dashboard/create/${project.id}`}
        className={
          compact
            ? "rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark"
            : "rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
        }
      >
        Open
      </Link>
      <ActionButton size="sm" variant="secondary" onClick={onDuplicate}>
        Duplicate
      </ActionButton>
      <ActionButton size="sm" variant="danger" onClick={onDelete}>
        Delete
      </ActionButton>
    </div>
  );
}

function ProjectCard({
  project,
  channelName,
  onDuplicate,
  onDelete,
}: {
  project: VideoProject;
  channelName: string | null;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const progress = projectProgress(project);
  const name = projectDisplayName(project);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <Link href={`/dashboard/create/${project.id}`} className="group relative block aspect-video overflow-hidden bg-surface-soft">
        <ProjectThumb project={project} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]" />
        <Badge tone={stepStatusTone(project.stepStatus.render)} size="sm" className="absolute top-3 left-3">
          {stepStatusLabel(project.stepStatus.render)}
        </Badge>
        <DurationBadge project={project} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display line-clamp-2 text-base font-semibold text-foreground">
          <Link href={`/dashboard/create/${project.id}`} className="hover:text-accent">
            {name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted">
          {channelName ?? "No channel"} · updated {relativeTime(project.lastUpdated)}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="blue" size="sm">
            {progress.approved} approved
          </Badge>
          <Badge tone={project.scenes.length ? "success" : "muted"} size="sm">
            {project.scenes.length} scenes
          </Badge>
        </div>
        <div className="mt-3">
          <ReadinessBar pct={progress.pct} ready={progress.ready} total={progress.total} />
        </div>
        <div className="mt-4">
          <ProjectActions project={project} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>
    </article>
  );
}

function ProjectListRow({
  project,
  channelName,
  onDuplicate,
  onDelete,
}: {
  project: VideoProject;
  channelName: string | null;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const progress = projectProgress(project);
  const name = projectDisplayName(project);

  return (
    <article className="grid gap-3 border-b border-border p-3 last:border-b-0 md:min-w-[860px] md:grid-cols-[7.5rem_minmax(0,1.5fr)_minmax(7rem,0.8fr)_5.5rem_7.5rem_auto] md:items-center">
      <Link
        href={`/dashboard/create/${project.id}`}
        className="relative block h-20 overflow-hidden rounded-xl bg-surface-soft md:h-14"
      >
        <ProjectThumb project={project} className="h-full w-full" />
        <DurationBadge project={project} />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display truncate text-sm font-semibold text-foreground">
            <Link href={`/dashboard/create/${project.id}`} className="hover:text-accent">
              {name}
            </Link>
          </h3>
          <Badge tone={stepStatusTone(project.stepStatus.render)} size="sm">
            {stepStatusLabel(project.stepStatus.render)}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted md:hidden">
          {channelName ?? "No channel"} · {relativeTime(project.lastUpdated)} · {progress.pct}% ready
        </p>
        <p className="mt-1 hidden text-xs text-muted md:block">
          {progress.approved} approved · {project.scenes.length} scenes
        </p>
      </div>
      <p className="hidden truncate text-sm text-muted md:block">{channelName ?? "No channel"}</p>
      <p className="hidden text-sm text-muted md:block">{relativeTime(project.lastUpdated)}</p>
      <div className="hidden md:block">
        <ReadinessBar pct={progress.pct} ready={progress.ready} total={progress.total} />
      </div>
      <ProjectActions project={project} onDuplicate={onDuplicate} onDelete={onDelete} compact />
    </article>
  );
}

function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: CreateViewMode;
  onChange: (mode: CreateViewMode) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-border" role="group" aria-label="Video layout">
      <button
        type="button"
        aria-label="Card view"
        aria-pressed={viewMode === "cards"}
        onClick={() => onChange("cards")}
        className={`flex h-9 w-9 items-center justify-center ${
          viewMode === "cards" ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={viewMode === "list"}
        onClick={() => onChange("list")}
        className={`flex h-9 w-9 items-center justify-center ${
          viewMode === "list" ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </button>
    </div>
  );
}

export function CreateIndexClient({
  channels,
  activeChannelId,
}: {
  channels: ConnectedChannel[];
  activeChannelId: string | null;
}) {
  const router = useRouter();
  const { hydrated, projects, createProject, duplicateProject, deleteProject } = useProjectStore();
  const [pendingDelete, setPendingDelete] = useState<VideoProject | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CreateViewMode>("cards");
  const sorted = [...projects].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
  const latest = sorted[0];
  const channelById = new Map(channels.map((channel) => [channel.id, channel.title]));
  const activeChannelName =
    (activeChannelId ? channelById.get(activeChannelId) : undefined) ?? "";

  useEffect(() => {
    const stored = window.localStorage.getItem(CREATE_VIEW_KEY);
    if (stored === "list" || stored === "cards") setViewMode(stored);
  }, []);

  function onViewModeChange(mode: CreateViewMode) {
    setViewMode(mode);
    window.localStorage.setItem(CREATE_VIEW_KEY, mode);
  }

  function onNew() {
    const channelId =
      activeChannelId && channels.some((channel) => channel.id === activeChannelId)
        ? activeChannelId
        : "";
    const project = createProject(channelId);
    router.push(`/dashboard/create/${project.id}`);
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProject(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not permanently delete the video.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function projectHandlers(project: VideoProject) {
    return {
      channelName: channelById.get(project.channelId) ?? null,
      onDuplicate: () => {
        const copy = duplicateProject(project.id);
        if (copy) router.push(`/dashboard/create/${copy.id}`);
      },
      onDelete: () => {
        setDeleteError(null);
        setPendingDelete(project);
      },
    };
  }

  return (
    <AgentLayout videoId="create-index" channelName={activeChannelName}>
      <Topbar
        title="Create Video"
        subtitle="AI pipeline drafts — generate, preview, and pick before you render"
        actions={<AgentToggle />}
      />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {hydrated && latest ? (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-accent">
              Continue where you left off
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
              {projectDisplayName(latest)}
            </h3>
            <p className="mt-1 text-sm text-muted">Updated {relativeTime(latest.lastUpdated)}</p>
            <Link
              href={`/dashboard/create/${latest.id}`}
              className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              Resume draft
            </Link>
          </div>
        ) : null}

        {!hydrated ? (
          <VideoGridSkeleton count={3} variant="project" showToolbar={false} label="Loading drafts" />
        ) : projects.length === 0 ? (
          <EmptyState
            title="No video drafts yet"
            description="Start a project to generate titles, script, scenes, voiceover, and a Remotion-ready brief."
            action={<ActionButton onClick={onNew}>New video</ActionButton>}
          />
        ) : (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Videos</h2>
                <p className="text-sm text-muted">
                  {projects.length} {projects.length === 1 ? "draft" : "drafts"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ActionButton size="sm" onClick={onNew}>
                  New video
                </ActionButton>
                <ViewToggle viewMode={viewMode} onChange={onViewModeChange} />
              </div>
            </div>

            {viewMode === "cards" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.map((project) => (
                  <ProjectCard key={project.id} project={project} {...projectHandlers(project)} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                <div className="hidden min-w-[860px] grid-cols-[7.5rem_minmax(0,1.5fr)_minmax(7rem,0.8fr)_5.5rem_7.5rem_auto] gap-3 border-b border-border px-3 py-2 text-[11px] font-semibold tracking-wide text-muted uppercase md:grid">
                  <span>Preview</span>
                  <span>Video</span>
                  <span>Channel</span>
                  <span>Updated</span>
                  <span>Readiness</span>
                  <span className="sr-only">Actions</span>
                </div>
                {sorted.map((project) => (
                  <ProjectListRow key={project.id} project={project} {...projectHandlers(project)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
      <Modal
        open={Boolean(pendingDelete)}
        title="Permanently delete video?"
        subtitle={pendingDelete ? projectDisplayName(pendingDelete) : undefined}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            This permanently deletes the draft and all related backend data, including snapshots,
            events, titles, scripts, transcripts, scenes, assets, checks, and export metadata. This
            action cannot be undone.
          </p>
          {deleteError ? (
            <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">{deleteError}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <ActionButton
              variant="secondary"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant="danger"
              onClick={confirmDelete}
              loading={deleting}
              loadingLabel="Deleting…"
            >
              Delete permanently
            </ActionButton>
          </div>
        </div>
      </Modal>
    </AgentLayout>
  );
}
