import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

function VideoCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-4 p-4">
        <div>
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="mt-2 h-4 w-[70%]" />
          <div className="mt-3 flex gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="mx-auto h-4 w-10" />
              <Skeleton className="mx-auto h-2.5 w-12" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
    </article>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-2 h-3.5 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-1.5 w-full rounded-full" />
      <div className="mt-3 flex gap-1.5">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export function VideoGridSkeleton({
  count = 8,
  showToolbar = true,
  variant = "video",
  label = "Loading videos",
}: {
  count?: number;
  showToolbar?: boolean;
  variant?: "video" | "project";
  label?: string;
}) {
  return (
    <SkeletonScreen label={label} className="space-y-6">
      {showToolbar ? (
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-24" />
            ))}
          </div>
          <Skeleton className="h-10 min-w-0 flex-1" />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: count }).map((_, index) =>
          variant === "project" ? (
            <ProjectCardSkeleton key={index} />
          ) : (
            <VideoCardSkeleton key={index} />
          ),
        )}
      </div>
    </SkeletonScreen>
  );
}
