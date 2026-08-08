import { Compass } from "lucide-react";

import type { MissionCandidateRow } from "@/application/missions/missions-views";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import ProgressBar from "@/components/ui/progress-bar";

import { StartMissionButton } from "./start-mission-button";

// Spotlights the single top real candidate from the same deterministic
// eligibility list Available Missions renders — not a separate "daily"
// concept with its own persistence, streak, or refresh schedule (V1 has
// no repeatable/recurring missions). "Today" just means "the top of your
// current real candidate list, right now."
export function DailyMissionCard({ candidate }: { candidate: MissionCandidateRow | null }) {
  return (
    <Card>
      <CardHeader title="Daily Mission" />

      {!candidate ? (
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
          <Compass className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No mission available right now</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            Check back as your accounts, budget, and goals change.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-[var(--foreground)]">{candidate.title}</p>
            {candidate.relatedPillarLabel && <Badge tone="primary">Supports: {candidate.relatedPillarLabel}</Badge>}
          </div>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">{candidate.description}</p>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1">
              <ProgressBar percent={candidate.completionPercent} />
            </div>
            <span className="text-xs text-[var(--foreground-muted)]">{candidate.completionPercent}%</span>
          </div>
          <p className="mt-2 text-xs text-[var(--foreground-muted)]">{candidate.explanation}</p>

          <div className="mt-3">
            <StartMissionButton candidate={candidate} />
          </div>
        </div>
      )}
    </Card>
  );
}
