import "server-only";

import { MISSION_TYPE_PILLAR, type MissionProgress } from "@/application/missions/mission-calculations";
import type { MissionCandidate } from "@/application/missions/mission-eligibility";
import type { MissionWithProgress } from "@/application/missions/service";
import type {
  MissionCandidateRow,
  MissionImpactSummary,
  MissionRow,
  MissionsOverviewView,
} from "@/application/missions/missions-views";
import { PILLAR_LABELS } from "@/application/confidence/confidence-calculations";
import type { Mission, MissionType } from "@/domains/missions/types";

import { getMissionService } from "./missions-composition";

export type { MissionsOverviewView };

// Server-only query orchestration for the Missions workspace — same role
// as goals-query.ts/budgets-query.ts: combines MissionService reads into a
// presentation-ready view model. No JSX, no try/catch — errors propagate
// to the route's error boundary. All formatting/labeling lives here, not
// in MissionService, matching every other domain's query-layer split.

function relatedPillarLabel(missionType: MissionType): string | null {
  const pillar = MISSION_TYPE_PILLAR[missionType];
  return pillar ? PILLAR_LABELS[pillar] : null;
}

function formatMissionValue(missionType: MissionType, value: number): string {
  switch (missionType) {
    case "stay-within-budget":
      return `${Math.round(value)}%`;
    case "fund-emergency-fund":
    case "reach-savings-goal":
    case "reduce-debt":
      return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    case "categorize-transactions":
      return `${Math.round(value)}`;
    case "improve-confidence":
      return `${Math.round(value)}`;
    case "custom":
      return "";
  }
}

function formatDateTimeLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toMissionRow(mission: Mission, progress: MissionProgress): MissionRow {
  return {
    id: mission.id,
    missionType: mission.missionType,
    title: mission.title,
    description: mission.description,
    status: mission.status,
    currentValueLabel: formatMissionValue(mission.missionType, progress.currentValue),
    targetValueLabel: formatMissionValue(mission.missionType, progress.targetValue),
    completionPercent: Math.round(progress.percentComplete),
    isComplete: progress.isComplete,
    explanation: progress.explanation,
    relatedPillarLabel: relatedPillarLabel(mission.missionType),
    startedAtLabel: formatDateTimeLabel(mission.startedAt),
    completedAtLabel: mission.completedAt ? formatDateTimeLabel(mission.completedAt) : null,
    canMarkComplete: mission.missionType === "custom" && mission.status === "active",
  };
}

const TOP_CANDIDATES_COUNT = 3;

function currencyLabel(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Aggregated only from the owner's own completed missions' own real,
// live-recomputed progress — never a re-derivation from Transactions/Goals
// directly, and never counting a mission that isn't actually completed.
// startValue is read from the mission's own immutable start-time snapshot
// (captured once, at start); currentValue is the same live number the
// mission's own card shows.
function computeImpactSummary(missionsWithProgress: MissionWithProgress[]): MissionImpactSummary {
  let totalDebtPaidOff = 0;
  let totalGoalsFunded = 0;
  let completedCount = 0;

  for (const { mission, progress } of missionsWithProgress) {
    if (mission.status !== "completed") continue;
    completedCount += 1;

    if (mission.missionType === "reduce-debt") {
      totalDebtPaidOff += Math.max(0, Number(mission.startValue ?? 0) - progress.currentValue);
    } else if (mission.missionType === "fund-emergency-fund" || mission.missionType === "reach-savings-goal") {
      totalGoalsFunded += progress.currentValue;
    }
  }

  return {
    completedCount,
    totalDebtPaidOffLabel: currencyLabel(totalDebtPaidOff),
    totalGoalsFundedLabel: currencyLabel(totalGoalsFunded),
  };
}

function toCandidateRow(candidate: MissionCandidate): MissionCandidateRow {
  return {
    missionType: candidate.missionType,
    title: candidate.title,
    description: candidate.description,
    completionPercent: Math.round(candidate.preview.percentComplete),
    explanation: candidate.preview.explanation,
    relatedPillarLabel: relatedPillarLabel(candidate.missionType),
    relatedGoalId: candidate.relatedGoalId,
    relatedAccountId: candidate.relatedAccountId,
    relatedBudgetPeriodId: candidate.relatedBudgetPeriodId,
  };
}

export async function getMissionsOverview(ownerId: string): Promise<MissionsOverviewView> {
  const missionService = getMissionService();

  const [candidates, missionsWithProgress] = await Promise.all([
    missionService.listCandidates(ownerId),
    missionService.listMissionsWithProgress(ownerId),
  ]);

  const active: MissionRow[] = [];
  const completed: MissionRow[] = [];
  const archived: MissionRow[] = [];

  for (const { mission, progress } of missionsWithProgress) {
    const row = toMissionRow(mission, progress);
    if (mission.status === "active") active.push(row);
    else if (mission.status === "completed") completed.push(row);
    else archived.push(row);
  }

  const candidateRows = candidates.map(toCandidateRow);

  return {
    hasMissions: active.length > 0 || completed.length > 0 || archived.length > 0,
    candidates: candidateRows,
    topCandidates: candidateRows.slice(0, TOP_CANDIDATES_COUNT),
    active,
    completed,
    archived,
    impactSummary: computeImpactSummary(missionsWithProgress),
  };
}
