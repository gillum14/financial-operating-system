import type { MissionStatus, MissionType } from "@/domains/missions/types";

// Presentation-shaped view model for the Missions workspace, kept outside
// src/composition/ (server-only) so "use client" components can import
// this *type* without pulling in a composition-root module — same pattern
// as Transactions/Accounts/Budgets/Goals/Reports.
//
// Every field here is real: hasMissions/candidates/active/completed all
// come from MissionService, which is itself backed entirely by the real
// Goals/Budgets/Accounts/Transactions/Confidence domains. There is no XP,
// level, streak, badge, or reward field anywhere in this model — Mission
// Engine V1 deliberately does not compute any of those concepts.
export interface MissionRow {
  id: string;
  missionType: MissionType;
  title: string;
  description: string;
  status: MissionStatus;
  currentValueLabel: string;
  targetValueLabel: string;
  completionPercent: number;
  isComplete: boolean;
  explanation: string;
  relatedPillarLabel: string | null;
  startedAtLabel: string;
  completedAtLabel: string | null;
  // True only for an active, missionType "custom" mission — the one case
  // where a "mark complete" action is legitimate (see MissionService.
  // completeCustomMission). Every other mission type completes only
  // through real-data evaluation, never a manual click.
  canMarkComplete: boolean;
}

export interface MissionCandidateRow {
  missionType: MissionType;
  title: string;
  description: string;
  completionPercent: number;
  explanation: string;
  relatedPillarLabel: string | null;
  // Exactly one of these is set — the exact id startMission needs to
  // re-identify this same candidate server-side.
  relatedGoalId?: string;
  relatedAccountId?: string;
  relatedBudgetPeriodId?: string;
}

// Aggregated entirely from the owner's own completed missions' own real,
// recorded start/current values (see missions-query.ts's
// computeImpactSummary) — never a re-attribution of unrelated Transactions/
// Goals activity. This is the honest version of what the original
// pre-Mission-Engine placeholder card explicitly refused to fabricate.
export interface MissionImpactSummary {
  completedCount: number;
  totalDebtPaidOffLabel: string;
  totalGoalsFundedLabel: string;
}

export interface MissionsOverviewView {
  hasMissions: boolean;
  candidates: MissionCandidateRow[];
  // The first ~3 candidates, for the main page's shortened list — same
  // deterministic order as `candidates`, never a separate ranking.
  topCandidates: MissionCandidateRow[];
  active: MissionRow[];
  completed: MissionRow[];
  archived: MissionRow[];
  impactSummary: MissionImpactSummary;
}
