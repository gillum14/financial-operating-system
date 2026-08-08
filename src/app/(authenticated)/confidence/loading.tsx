import { RAIL_GRID_COLS } from "@/lib/page-grid";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] ${className}`}
    />
  );
}

export default function ConfidenceLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <SkeletonBlock className="h-16 w-72" />

      <div className="grid gap-6 md:grid-cols-3">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
      </div>

      <div className={`${RAIL_GRID_COLS} items-start`}>
        <div className="space-y-6">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-96" />
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonBlock className="h-56" />
            <SkeletonBlock className="h-56" />
          </div>
          <SkeletonBlock className="h-20" />
        </div>
        <div className="hidden space-y-4 min-[1360px]:block">
          <SkeletonBlock className="h-56" />
        </div>
      </div>

      <div className="space-y-4 min-[1360px]:hidden">
        <SkeletonBlock className="h-56" />
      </div>
    </div>
  );
}
