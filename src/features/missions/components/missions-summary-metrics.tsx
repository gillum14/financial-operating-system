import { Flame, Gift, Star, Trophy } from "lucide-react";

import type { MissionProgressionView } from "@/application/missions/missions-views";
import StatCard, { StatCaption } from "@/components/ui/stat-card";

// Matches the mockup's 4-tile layout and labels — now backed by the real
// Mission Progression System (MissionProgressionService via
// missions-query.ts). Total Points is lifetime XP; Level and streak both
// derive from real completions and their dates; Rewards Earned is the
// real unlocked-achievement count. Nothing here is fabricated, and none
// of it can influence the Confidence Score (see progression-service.ts's
// module comment for why that separation is structural, not incidental).
export function MissionsSummaryMetrics({ progression }: { progression: MissionProgressionView }) {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Points" value={progression.totalXp.toLocaleString("en-US")} icon={Trophy}>
        <StatCaption caption="Lifetime XP" />
      </StatCard>

      <StatCard label="Level" value={String(progression.level)} icon={Star}>
        <StatCaption caption={progression.xpIntoLevelLabel} />
      </StatCard>

      <StatCard label="Current Streak" value={`${progression.currentStreak}d`} icon={Flame}>
        <StatCaption caption={progression.longestStreak > 0 ? `Best: ${progression.longestStreak}d` : "Complete a mission to start one"} />
      </StatCard>

      <StatCard label="Rewards Earned" value={String(progression.unlockedRewards.length)} icon={Gift}>
        <StatCaption caption={progression.unlockedRewards.length > 0 ? progression.unlockedRewards[0].title : "None yet"} />
      </StatCard>
    </section>
  );
}
