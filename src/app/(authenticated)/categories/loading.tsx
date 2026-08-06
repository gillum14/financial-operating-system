function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] ${className}`}
    />
  );
}

export default function CategoriesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-start justify-between">
        <SkeletonBlock className="h-16 w-64" />
        <SkeletonBlock className="h-11 w-40" />
      </div>

      <SkeletonBlock className="h-11 w-full max-w-sm" />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
      </div>

      <div className="space-y-3">
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
        <SkeletonBlock className="h-16" />
      </div>
    </div>
  );
}
