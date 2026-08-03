import { BUDGETS_GRID_COLS } from "@/features/budgets/layout";

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
      <SkeletonBlock className="h-20" />
      <SkeletonBlock className="h-32" />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
    </>
  );
}

export default function BudgetsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <SkeletonBlock className="h-16 w-64" />
      <SkeletonBlock className="h-10" />

      {/* Same BUDGETS_GRID_COLS as the real metrics row: Overall Progress's
          skeleton lines up with the rail's width, the other 3 share the
          main column. */}
      <div className={BUDGETS_GRID_COLS}>
        <div className="grid gap-6 sm:grid-cols-3">
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
        </div>
        <SkeletonBlock className="h-28" />
      </div>

      <div className={`${BUDGETS_GRID_COLS} items-start`}>
        <SkeletonBlock className="h-72" />
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
