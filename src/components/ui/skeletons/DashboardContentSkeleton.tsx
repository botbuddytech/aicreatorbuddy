import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { VideoGridSkeleton } from "@/components/ui/skeletons/VideoGridSkeleton";

export function DashboardContentSkeleton({
  label = "Loading dashboard",
  includeHeading = true,
}: {
  label?: string;
  includeHeading?: boolean;
}) {
  return (
    <SkeletonScreen label={label}>
      {includeHeading ? (
        <div className="px-4 pt-5 sm:px-6 sm:pt-6">
          <Skeleton className="h-8 w-48 sm:w-64" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
      ) : null}

      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border bg-surface p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-28" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border bg-surface p-5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-48" />
              <div className="mt-5 space-y-3">
                {Array.from({ length: 5 }).map((__, row) => (
                  <div key={row} className="flex items-center gap-3">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-2.5 flex-1 rounded-full" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <VideoGridSkeleton count={4} showToolbar={false} />
      </div>
    </SkeletonScreen>
  );
}
