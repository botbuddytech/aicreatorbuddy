"use client";

import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { Topbar } from "@/components/dashboard/Topbar";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { VideoGridSkeleton } from "@/components/ui/skeletons/VideoGridSkeleton";
import { workspaceChannels } from "@/lib/dashboardContent";
import { useProjectStore } from "@/lib/useVideoProjectDraft";
import {
  deriveReadiness,
  projectDisplayName,
  stepStatusLabel,
  stepStatusTone,
  type VideoProject,
} from "@/lib/videoProject";

function relativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.round(delta / 60000);
  if (Number.isNaN(mins) || mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

function ProjectCard({
  project,
  onDuplicate,
  onDelete,
}: {
  project: VideoProject;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const channel = workspaceChannels.find((item) => item.id === project.channelId);
  const items = deriveReadiness(project);
  const ready = items.filter((item) => item.complete).length;
  const pct = Math.round((ready / items.length) * 100);
  const approved = Object.values(project.stepStatus).filter((status) => status === "approved").length;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            {projectDisplayName(project)}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {channel?.name ?? "No channel"} · updated {relativeTime(project.lastUpdated)}
          </p>
        </div>
        <Badge tone={stepStatusTone(project.stepStatus.render)}>
          {stepStatusLabel(project.stepStatus.render)}
        </Badge>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
          <span>Readiness</span>
          <span>
            {ready}/{items.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="blue">{approved} approved</Badge>
        <Badge tone={project.scenes.length ? "success" : "muted"}>
          {project.scenes.length} scenes
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/create/${project.id}`}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
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
    </div>
  );
}

export default function CreateIndexPage() {
  const router = useRouter();
  const { hydrated, projects, createProject, duplicateProject, deleteProject } = useProjectStore();
  const latest = [...projects].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))[0];

  function onNew() {
    const channelId = workspaceChannels[0]?.id ?? "";
    const project = createProject(channelId);
    router.push(`/dashboard/create/${project.id}`);
  }

  return (
    <>
      <Topbar
        title="Create Video"
        subtitle="AI pipeline drafts — generate, preview, and pick before you render"
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
            action={
              <ActionButton onClick={onNew}>New video</ActionButton>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDuplicate={() => {
                  const copy = duplicateProject(project.id);
                  if (copy) router.push(`/dashboard/create/${copy.id}`);
                }}
                onDelete={() => deleteProject(project.id)}
              />
            ))}
            <button
              type="button"
              onClick={onNew}
              className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-5 text-center transition-colors hover:border-accent/50 hover:bg-surface"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </span>
              <p className="mt-3 font-display text-base font-semibold text-foreground">
                New video
              </p>
              <p className="mt-1 text-sm text-muted">Start a draft in this workspace</p>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
