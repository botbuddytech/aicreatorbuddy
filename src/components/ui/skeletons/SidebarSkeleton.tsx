import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

export function SidebarSkeleton() {
  return (
    <SkeletonScreen
      label="Loading navigation"
      className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface lg:static lg:z-30"
    >
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="mt-1.5 h-2.5 w-16" />
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-hidden px-3 py-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <Skeleton className="h-4 w-4 shrink-0 rounded-md" />
            <Skeleton className={`h-3.5 ${index % 3 === 0 ? "w-32" : "w-24"}`} />
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-2 border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-1.5 h-2.5 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </SkeletonScreen>
  );
}
