import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

export default function AnalyticsLoading() {
  return (
    <SkeletonScreen label="Loading analytics" className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </SkeletonScreen>
  );
}
