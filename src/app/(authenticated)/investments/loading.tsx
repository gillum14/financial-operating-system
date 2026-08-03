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
      <SkeletonBlock className="h-40" />
      <SkeletonBlock className="h-32" />
      <SkeletonBlock className="h-32" />
    </>
  );
}

export default function InvestmentsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <SkeletonBlock className="h-16 w-64" />
        <SkeletonBlock className="h-10 w-40" />
      </div>
      <SkeletonBlock className="h-10" />

      {/* Same RAIL_GRID_COLS as the real page: the tabs skeleton above is
          full-width, but the metrics skeleton lives inside the left
          column, and the rail skeleton starts at the same top edge. */}
      <div className={`${RAIL_GRID_COLS} items-start`}>
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-20" />
        </div>
        <div className="hidden space-y-4 min-[1360px]:block">
          <RailSkeleton />
        </div>
      </div>

      <div className="mt-6 space-y-4 min-[1360px]:hidden">
        <RailSkeleton />
      </div>
    </div>
  );
}
