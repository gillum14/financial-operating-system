import { CheckCircle2, Gift, Lock } from "lucide-react";

import type { MissionProgressionView } from "@/application/missions/missions-views";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import ProgressBar from "@/components/ui/progress-bar";

// The full reward catalog for the Rewards tab — every title, description,
// unlock date, and progress-toward-unlocking figure comes straight from
// MissionProgressionView (itself built entirely from
// progression-calculations.ts's REWARD_DEFINITIONS/computeRewardProgress
// in missions-query.ts). Nothing here re-derives a threshold or
// re-computes a percentage; this component only formats what the server
// already decided. Currently always exactly 8 rewards — the empty state
// below is a defensive fallback (matching every other card in this
// feature), not a state this page can actually reach today.
export function RewardsTabPanel({ progression }: { progression: MissionProgressionView }) {
  const { unlockedRewards, lockedRewards } = progression;
  const hasAny = unlockedRewards.length > 0 || lockedRewards.length > 0;

  return (
    <Card>
      <CardHeader title="Rewards" />

      {!hasAny ? (
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
          <Gift className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No rewards yet</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            Complete missions to start earning rewards.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {unlockedRewards.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[var(--foreground-muted)] uppercase">
                Unlocked ({unlockedRewards.length})
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unlockedRewards.map((reward) => (
                  <li
                    key={reward.key}
                    className="rounded-[calc(var(--radius)-8px)] border border-[var(--success)]/30 bg-[var(--success)]/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
                        <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <Badge tone="success">Unlocked</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{reward.title}</p>
                    <p className="mt-1 text-xs text-[var(--foreground-muted)]">{reward.description}</p>
                    <p className="mt-2 text-xs font-medium text-[var(--success)]">Unlocked {reward.unlockedAtLabel}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lockedRewards.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[var(--foreground-muted)] uppercase">
                Locked ({lockedRewards.length})
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lockedRewards.map((reward) => (
                  <li key={reward.key} className="rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--foreground-muted)]">
                        <Lock className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <Badge tone="neutral">Locked</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[var(--foreground-secondary)]">{reward.title}</p>
                    <p className="mt-1 text-xs text-[var(--foreground-muted)]">{reward.description}</p>
                    <div className="mt-3">
                      <ProgressBar percent={reward.progressPercent} color="var(--foreground-muted)" />
                      <p className="mt-1.5 text-xs text-[var(--foreground-muted)]">{reward.progressLabel}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
