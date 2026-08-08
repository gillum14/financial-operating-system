import { Unlock } from "lucide-react";

import type { MissionCandidateRow } from "@/application/missions/missions-views";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

import { StartMissionButton } from "./start-mission-button";
import { ViewAllMissionsButton } from "./view-all-missions-button";

// A candidate here means MissionService.listCandidates found real,
// current eligibility for it right now (an active emergency-fund goal, an
// active budget period, uncategorized transactions, a liability balance,
// or room to reach the next Confidence band) — never a fabricated or
// AI-suggested list. Nothing here is persisted until StartMissionButton's
// startMission() call succeeds.
//
// Shows only `topCandidates` (missions-query.ts's deterministic first-3
// slice of the same real `allCandidates` list) so this card stays short;
// "View All Missions" opens the full list (and Create Custom Mission) in
// a modal — same data, just not truncated.
export function AvailableMissionsCard({
  topCandidates,
  allCandidates,
}: {
  topCandidates: MissionCandidateRow[];
  allCandidates: MissionCandidateRow[];
}) {
  return (
    <Card>
      <CardHeader title="Available Missions">
        <ViewAllMissionsButton candidates={allCandidates} />
      </CardHeader>

      {topCandidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
          <Unlock className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No missions available right now</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            As your accounts, budget, and goals change, new missions will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {topCandidates.map((candidate) => (
            <li
              key={`${candidate.missionType}:${candidate.relatedGoalId ?? candidate.relatedAccountId ?? candidate.relatedBudgetPeriodId ?? ""}`}
              className="flex flex-col gap-3 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">{candidate.title}</p>
                  {candidate.relatedPillarLabel && <Badge tone="primary">Supports: {candidate.relatedPillarLabel}</Badge>}
                </div>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">{candidate.description}</p>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">{candidate.explanation}</p>
              </div>

              <StartMissionButton candidate={candidate} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
