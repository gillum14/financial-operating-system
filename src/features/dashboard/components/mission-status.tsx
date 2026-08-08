import Link from "next/link";
import { CalendarClock, Coins, ListChecks, PiggyBank, Sparkles, Target, TrendingDown, type LucideIcon } from "lucide-react";

import type { MissionRow } from "@/application/missions/missions-views";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import ProgressBar from "@/components/ui/progress-bar";

const MISSION_ICON: Record<MissionRow["missionType"], LucideIcon> = {
  "stay-within-budget": Coins,
  "fund-emergency-fund": PiggyBank,
  "reach-savings-goal": Target,
  "categorize-transactions": ListChecks,
  "reduce-debt": TrendingDown,
  "improve-confidence": CalendarClock,
  custom: Sparkles,
};

// Real active missions (MissionService, via getMissionsOverview) —
// replaces the previous hardcoded emergency-fund/debt-paydown/investments/
// budget-compliance mock tiles. No invented "on track"/"needs attention"
// judgment here: completionPercent alone isn't a reliable proxy for that
// across every mission type (a stay-within-budget mission near 100% is a
// warning sign, not good news, unlike a savings goal near 100%), so this
// shows the same real percent + explanation every mission already exposes
// rather than fabricate a second-order status label.
export function MissionStatus({ missions }: { missions: MissionRow[] }) {
  if (missions.length === 0) {
    return (
      <Card>
        <CardHeader title="Mission Status" />
        <p className="text-sm text-[var(--foreground-muted)]">
          No active missions yet.{" "}
          <Link href="/missions" className="font-medium text-[var(--primary)] hover:underline">
            Start one
          </Link>{" "}
          from your real accounts, budget, and goals.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Mission Status">
        <Link href="/missions" className="text-sm font-medium text-[var(--primary)] hover:underline">
          View all
        </Link>
      </CardHeader>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {missions.slice(0, 4).map((mission) => {
          const Icon = MISSION_ICON[mission.missionType];

          return (
            <div key={mission.id} className="flex flex-col items-start gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>

              <p className="text-sm font-medium text-[var(--foreground)]">{mission.title}</p>
              <div className="w-full">
                <ProgressBar percent={mission.completionPercent} />
              </div>
              <p className="text-xs text-[var(--foreground-muted)]">{mission.completionPercent}% complete</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
