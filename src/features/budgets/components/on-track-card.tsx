import { RailCard } from "@/components/ui/rail-card";

export function OnTrackCard({
  onTrack,
}: {
  onTrack?: { onTrackCount: number; overspentCount: number; totalCount: number };
}) {
  if (!onTrack || onTrack.totalCount === 0) {
    return (
      <RailCard title="On Track">
        <p className="text-sm text-[var(--foreground-secondary)]">Category tracking isn&apos;t available yet.</p>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">This will appear once a budget exists.</p>
      </RailCard>
    );
  }

  const { onTrackCount, overspentCount, totalCount } = onTrack;

  return (
    <RailCard title="On Track">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--foreground-secondary)]">On track</span>
        <span className="font-medium text-[var(--success)]">
          {onTrackCount} of {totalCount}
        </span>
      </div>
      {overspentCount > 0 ? (
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-[var(--foreground-secondary)]">Overspent</span>
          <span className="font-medium text-[var(--danger)]">{overspentCount}</span>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--foreground-muted)]">No categories are overspent right now.</p>
      )}
    </RailCard>
  );
}
