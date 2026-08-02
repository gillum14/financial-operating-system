function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] ${className}`}
    />
  );
}

export default function AccountDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-10 w-80" />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-56" />
        </div>
        <div className="space-y-6">
          <SkeletonBlock className="h-56" />
          <SkeletonBlock className="h-40" />
        </div>
      </div>
    </div>
  );
}
