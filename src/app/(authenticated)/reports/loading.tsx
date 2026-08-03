function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] ${className}`}
    />
  );
}

export default function ReportsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <SkeletonBlock className="h-16 w-64" />
        <SkeletonBlock className="h-10 w-28" />
      </div>
      <SkeletonBlock className="h-10" />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-72" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-56" />
      </div>

      <SkeletonBlock className="h-20" />
    </div>
  );
}
