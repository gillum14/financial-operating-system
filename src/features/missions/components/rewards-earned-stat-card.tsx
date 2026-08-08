"use client";

import { Gift } from "lucide-react";

import type { MissionProgressionView } from "@/application/missions/missions-views";
import StatCard, { StatCaption } from "@/components/ui/stat-card";

import { useMissionsTabs } from "./missions-tabs";

// The one summary tile that doubles as navigation: same real progression
// data every other tile in MissionsSummaryMetrics reads (no separate
// fetch), but clicking it also switches the tab strip to Rewards via
// MissionsTabs' own context — pulled out of MissionsSummaryMetrics into
// its own "use client" file so the other three tiles stay plain
// server-rendered markup.
export function RewardsEarnedStatCard({ progression }: { progression: MissionProgressionView }) {
  const { setActiveTab } = useMissionsTabs();

  return (
    <StatCard
      label="Rewards Earned"
      value={String(progression.unlockedRewards.length)}
      icon={Gift}
      onClick={() => setActiveTab("rewards")}
    >
      <StatCaption caption={progression.unlockedRewards.length > 0 ? progression.unlockedRewards[0].title : "None yet"} />
    </StatCard>
  );
}
