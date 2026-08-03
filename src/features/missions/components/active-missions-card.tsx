import { Compass } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: active missions (in-progress, with real progress/XP/points)
// require a Missions domain that doesn't exist yet. Rendered as an honest
// empty state rather than the approved mockup's populated list, which
// would fabricate missions, progress, and rewards that don't exist.
export function ActiveMissionsCard() {
  return (
    <Card>
      <CardHeader title="Active Missions">
        <button
          type="button"
          disabled
          title="Not available yet"
          className="cursor-not-allowed text-sm font-medium text-[var(--foreground-muted)] opacity-70"
        >
          View all missions
        </button>
      </CardHeader>

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-12 text-center">
        <Compass className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No active missions</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          Missions aren&apos;t available yet — check back once this feature launches.
        </p>
      </div>
    </Card>
  );
}
