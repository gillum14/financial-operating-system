import { Gift } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// Restored to the shell layout, but still functionally honest: Mission
// Engine V1 has no reward system (no XP, no points, no unlockable
// rewards — see docs/adr/0006-mission-engine-v1-scope.md). This card
// never fabricates a reward name or value; it says plainly that rewards
// aren't a supported concept yet, the same as the pre-Mission-Engine
// placeholder did.
export function UpcomingRewardsCard() {
  return (
    <Card>
      <CardHeader title="Upcoming Rewards" />

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
        <Gift className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">Rewards aren&apos;t available yet</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          Mission Engine V1 focuses on real progress — a rewards system isn&apos;t built yet.
        </p>
      </div>
    </Card>
  );
}
