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
      <SkeletonBlock className="h-20" />
      <SkeletonBlock className="h-16" />
      <SkeletonBlock className="h-16" />
    </>
  );
}

export default function TransactionsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <SkeletonBlock className="h-16 w-64" />
      <SkeletonBlock className="h-16" />

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">
        <SkeletonBlock className="h-96" />
        <div className="hidden space-y-4 2xl:block">
          <RailSkeleton />
        </div>
      </div>

      <div className="space-y-4 2xl:hidden">
        <RailSkeleton />
      </div>
    </div>
  );
}
