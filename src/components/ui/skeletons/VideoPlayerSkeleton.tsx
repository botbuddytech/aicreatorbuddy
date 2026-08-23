import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

function RelatedRowSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="aspect-video w-40 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <Skeleton className="h-3.5 w-[95%]" />
        <Skeleton className="h-3.5 w-[70%]" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function VideoPlayerSkeleton({
  label = "Loading video",
}: {
  label?: string;
}) {
  return (
    <SkeletonScreen label={label} className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
      <Skeleton className="h-4 w-24" />

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-36 shrink-0" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton className="h-14 w-14 rounded-full bg-white/10" />
            </div>
          </div>

          <Skeleton className="mt-4 h-7 w-[85%]" />
          <Skeleton className="mt-2 h-4 w-[55%]" />

          <div className="mt-4 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>

          <Skeleton className="mt-5 h-28 w-full rounded-2xl" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <RelatedRowSkeleton key={index} />
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
