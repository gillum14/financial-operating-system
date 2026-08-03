import { Flame, Gift, Star, Trophy } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";

// All four tiles are honest placeholders while hasMissions is false — "—"
// rather than "0", since "zero points" and "points aren't a supported
// concept yet" are different facts. Deliberately NOT given the mockup's
// colored icon backgrounds (purple/gold/green/blue): those read as an
// active, exciting gamified feature, which would misrepresent a feature
// that is entirely inactive. Kept to the same neutral StatCard treatment
// as every other honestly-empty metric tile in this app (Budgets, Goals).
export function MissionsSummaryMetrics({ hasMissions }: { hasMissions: boolean }) {
  if (hasMissions) {
    // Unreachable today (hasMissions is always false — see
    // missions-query.ts), kept as the real-data branch this component
    // will take once a Missions domain exists, so this file doesn't need
    // a rewrite at that point.
    return null;
  }

  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Points" value="—" icon={Trophy}>
        <StatCaption caption="Missions aren't active yet" />
      </StatCard>

      <StatCard label="Level" value="—" icon={Star}>
        <StatCaption caption="Missions aren't active yet" />
      </StatCard>

      <StatCard label="Current Streak" value="—" icon={Flame}>
        <StatCaption caption="Missions aren't active yet" />
      </StatCard>

      <StatCard label="Rewards Earned" value="—" icon={Gift}>
        <StatCaption caption="Missions aren't active yet" />
      </StatCard>
    </section>
  );
}
