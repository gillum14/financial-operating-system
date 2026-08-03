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
      <SkeletonBlock className="h-32" />
      <SkeletonBlock className="h-32" />
      <SkeletonBlock className="h-24" />
    </>
  );
}

export default function RetirementLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <SkeletonBlock className="h-16 w-64" />
        <SkeletonBlock className="h-10 w-48" />
      </div>
      <SkeletonBlock className="h-10" />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
      </div>

      <div className={`${RAIL_GRID_COLS} items-start`}>
        <div className="space-y-6">
          <SkeletonBlock className="h-96" />
          <SkeletonBlock className="h-64" />
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
