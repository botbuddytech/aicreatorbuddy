"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { CreateVideoWorkspace } from "@/components/create/CreateVideoWorkspace";
import { VideoProjectProvider } from "@/components/create/VideoProjectProvider";
import { VideoPlayerSkeleton } from "@/components/ui/skeletons/VideoPlayerSkeleton";
import type { LlmIntegrationAvailability } from "@/lib/integrations/llmAvailability";
import type { ConnectedChannel } from "@/lib/youtube/repo";

function WorkspaceFallback() {
  return (
    <>
      <Topbar title="Create Video" subtitle="Loading draft…" />
      <VideoPlayerSkeleton label="Loading video workspace" />
    </>
  );
}

function MissingProject() {
  return (
    <>
      <Topbar title="Draft not found" subtitle="This project isn’t available here" />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">
            The draft may have been deleted, or it has never been synced from another device.
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

export function CreateProjectClient({
  projectId,
  channels,
  llmAvailability,
}: {
  projectId: string;
  channels: ConnectedChannel[];
  llmAvailability: LlmIntegrationAvailability;
}) {
  return (
    // The provider reads the step from useSearchParams, which needs a boundary.
    <Suspense fallback={<WorkspaceFallback />}>
      <VideoProjectProvider
        key={projectId}
        projectId={projectId}
        channels={channels}
        llmAvailability={llmAvailability}
        fallback={<WorkspaceFallback />}
        missing={<MissingProject />}
      >
        <CreateVideoWorkspace />
      </VideoProjectProvider>
    </Suspense>
  );
}
