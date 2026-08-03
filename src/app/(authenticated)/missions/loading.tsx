import { RAIL_GRID_COLS } from "@/lib/page-grid";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] ${className}`}
    />
  );
}

function RailSkeleton() {
  return (
    <>
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
    </>
  );
}

export default function MissionsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <SkeletonBlock className="h-24 w-80" />
        <SkeletonBlock className="h-24 lg:w-96" />
      </div>

      {/* Same RAIL_GRID_COLS as the real page: the tabs + metrics
          skeleton is confined to the left column, and the rail skeleton
          starts at the very top, beside the tabs. */}
      <div className={`${RAIL_GRID_COLS} items-start`}>
        <div className="space-y-6">
          <SkeletonBlock className="h-10" />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-20" />
        </div>
        <div className="hidden space-y-4 min-[1360px]:block">
          <RailSkeleton />
        </div>
      </div>

      <div className="space-y-4 min-[1360px]:hidden">
        <RailSkeleton />
      </div>
    </div>
  );
}
