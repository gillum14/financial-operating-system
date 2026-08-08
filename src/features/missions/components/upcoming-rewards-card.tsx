import { CheckCircle2, Gift, Lock } from "lucide-react";

import type { MissionProgressionView } from "@/application/missions/missions-views";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// The Mission Progression System's 8 real, deterministic rewards (see
// progression-calculations.ts's REWARD_DEFINITIONS) — every unlocked one
// shown here has a real unlock date from the immutable mission_rewards
// ledger; every locked one shows only its title/description, never a
// fabricated "X to go" progress count.
export function UpcomingRewardsCard({ progression }: { progression: MissionProgressionView }) {
  const hasAny = progression.unlockedRewards.length > 0 || progression.lockedRewards.length > 0;

  return (
    <Card>
      <CardHeader title="Upcoming Rewards" />

      {!hasAny ? (
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
          <Gift className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No rewards yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {progression.unlockedRewards.map((reward) => (
            <li key={reward.key} className="flex items-start gap-2.5 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">{reward.title}</p>
                <p className="text-xs text-[var(--foreground-muted)]">Unlocked {reward.unlockedAtLabel}</p>
              </div>
            </li>
          ))}
          {progression.lockedRewards.map((reward) => (
            <li key={reward.key} className="flex items-start gap-2.5 rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] p-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--foreground-muted)]" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--foreground-secondary)]">{reward.title}</p>
                <p className="text-xs text-[var(--foreground-muted)]">{reward.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
