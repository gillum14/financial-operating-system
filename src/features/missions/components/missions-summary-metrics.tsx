import { Flame, Gift, Star, Trophy } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";

// Matches the mockup's 4-tile layout and labels, but — same as the
// pre-Mission-Engine placeholder version of this file — every value stays
// an honest "—", never a fabricated number: there is no XP, leveling,
// streak-tracking, or rewards system anywhere in this codebase (see
// docs/adr/0006-mission-engine-v1-scope.md). Real mission counts
// (available/active/completed) are shown elsewhere on this page instead,
// where they're backed by real data.
export function MissionsSummaryMetrics() {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Points" value="—" icon={Trophy}>
        <StatCaption caption="Not tracked in this version" />
      </StatCard>

      <StatCard label="Level" value="—" icon={Star}>
        <StatCaption caption="Not tracked in this version" />
      </StatCard>

      <StatCard label="Current Streak" value="—" icon={Flame}>
        <StatCaption caption="Not tracked in this version" />
      </StatCard>

      <StatCard label="Rewards Earned" value="—" icon={Gift}>
        <StatCaption caption="Not tracked in this version" />
      </StatCard>
    </section>
  );
}
