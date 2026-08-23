"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/dashboard/Topbar";
import { CreateVideoWorkspace } from "@/components/create/CreateVideoWorkspace";
import { VideoProjectProvider } from "@/components/create/VideoProjectProvider";
import { Skeleton } from "@/components/ui/Skeleton";

function WorkspaceFallback() {
  return (
    <>
      <Topbar title="Create Video" subtitle="Loading draft…" />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-6">
          <Skeleton className="h-36" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-36 shrink-0" />
            ))}
          </div>
          <Skeleton className="h-[28rem]" />
        </div>
      </div>
    </>
  );
}

function MissingProject() {
  return (
    <>
      <Topbar title="Draft not found" subtitle="This project isn’t in local storage" />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">
            The draft may have been deleted, or you’re on a different browser profile.
          </p>
          <Link
            href="/dashboard/create"
            className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            Back to all videos
          </Link>
        </div>
      </div>
    </>
  );
}

export default function CreateProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  if (!projectId) return <MissingProject />;

  return (
    <VideoProjectProvider
      key={projectId}
      projectId={projectId}
      fallback={<WorkspaceFallback />}
      missing={<MissingProject />}
    >
      <CreateVideoWorkspace />
    </VideoProjectProvider>
  );
}
