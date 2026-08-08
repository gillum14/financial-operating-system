import type { GoalProgress } from "@/application/goals/goal-calculations";
import type { BudgetPeriodTotals } from "@/application/budgets/budget-calculations";
import type { Account } from "@/domains/accounts/types";
import type { BudgetPeriodStatus } from "@/domains/budgets/types";
import type { Mission, MissionType } from "@/domains/missions/types";

import {
  computeCategorizeTransactionsProgress,
  computeGoalMissionProgress,
  computeReduceDebtProgress,
  computeStayWithinBudgetProgress,
  isLiabilityAccountType,
  nextBandUp,
  type MissionProgress,
} from "./mission-calculations";

// Pure, deterministic eligibility — no AI, no recommendation scoring, no
// persistence. Every rule here is a plain conditional against real,
// already-fetched domain data (mirrors deriveUpcomingObjectives in
// goal-calculations.ts: deterministic, explainable selection, not a
// scoring formula). A candidate is never persisted — it exists only for
// the duration of one read, and becomes a real Mission row only through
// MissionService.startMission, which re-runs this exact same eligibility
// check server-side before writing anything (never trusts a client-held
// candidate as still valid).

export interface MissionCandidate {
  missionType: MissionType;
  title: string;
  description: string;
  relatedGoalId?: string;
  relatedAccountId?: string;
  relatedBudgetPeriodId?: string;
  relatedTransactionIds?: string[];
  targetBandId?: string;
  // What progress would look like if this candidate were started right
  // now — preview only, never persisted; MissionService captures its own
  // fresh baseline at the moment a mission actually starts.
  preview: MissionProgress;
}

export interface MissionEligibilityInputs {
  goalProgressList: GoalProgress[];
  activeBudgetPeriod: { id: string; status: BudgetPeriodStatus; periodLabel: string; totals: BudgetPeriodTotals } | null;
  // The exact set of currently-uncategorized transaction ids — already
  // computed by the caller via TransactionRepository's uncategorizedOnly
  // filter, never re-derived here.
  uncategorizedTransactionIds: string[];
  // Active accounts only, already filtered to liability types with a
  // known, nonzero balance — see missions-query.ts for the filtering.
  liabilityAccounts: Account[];
  confidenceOverallScore: number | null;
  // Every mission this owner has ever started, any status — used purely
  // for de-duplication (see dedupeKeyForMission below), never re-evaluated
  // for progress here.
  existingMissions: Mission[];
}

// One key per (missionType, related entity) — or per missionType alone
// for the two entity-less types. A candidate is excluded whenever this key
// already belongs to an active or completed mission; archiving a mission
// frees its key up again (an explicit "put this away, allow a new one"
// action — see missions.ts's schema comment).
function dedupeKeyForMission(mission: Pick<Mission, "missionType" | "relatedGoalId" | "relatedAccountId" | "relatedBudgetPeriodId">): string {
  const entityId = mission.relatedGoalId ?? mission.relatedAccountId ?? mission.relatedBudgetPeriodId ?? "";
  return `${mission.missionType}:${entityId}`;
}

export function computeEligibleMissionCandidates(inputs: MissionEligibilityInputs): MissionCandidate[] {
  const takenKeys = new Set(
    inputs.existingMissions.filter((mission) => mission.status !== "archived").map(dedupeKeyForMission),
  );

  const candidates: MissionCandidate[] = [];

  // ---- stay-within-budget --------------------------------------------
  if (inputs.activeBudgetPeriod && inputs.activeBudgetPeriod.totals.totalBudgeted > 0) {
    const key = `stay-within-budget:${inputs.activeBudgetPeriod.id}`;
    if (!takenKeys.has(key)) {
      candidates.push({
        missionType: "stay-within-budget",
        title: `Stay Within Budget — ${inputs.activeBudgetPeriod.periodLabel}`,
        description: "Keep total spending at or under your planned amount for this budget period.",
        relatedBudgetPeriodId: inputs.activeBudgetPeriod.id,
        preview: computeStayWithinBudgetProgress(inputs.activeBudgetPeriod.status, inputs.activeBudgetPeriod.totals),
      });
    }
  }

  // ---- fund-emergency-fund / reach-savings-goal ------------------------
  for (const progress of inputs.goalProgressList) {
    if (progress.goal.status !== "active") continue;

    const isEmergencyFund = progress.goal.goalType === "emergency-fund";
    const missionType: MissionType = isEmergencyFund ? "fund-emergency-fund" : "reach-savings-goal";
    const key = `${missionType}:${progress.goal.id}`;
    if (takenKeys.has(key)) continue;

    candidates.push({
      missionType,
      title: isEmergencyFund ? `Fund "${progress.goal.title}"` : `Reach "${progress.goal.title}"`,
      description: isEmergencyFund
        ? "Build your emergency fund toward its target."
        : "Make progress toward this savings goal.",
      relatedGoalId: progress.goal.id,
      preview: computeGoalMissionProgress(progress),
    });
  }

  // ---- categorize-transactions ------------------------------------------
  if (inputs.uncategorizedTransactionIds.length > 0 && !takenKeys.has("categorize-transactions:")) {
    const count = inputs.uncategorizedTransactionIds.length;
    candidates.push({
      missionType: "categorize-transactions",
      title: "Categorize Your Transactions",
      description: `Review and categorize ${count} uncategorized transaction${count === 1 ? "" : "s"}.`,
      relatedTransactionIds: inputs.uncategorizedTransactionIds,
      preview: computeCategorizeTransactionsProgress(inputs.uncategorizedTransactionIds, new Set()),
    });
  }

  // ---- reduce-debt ---------------------------------------------------
  for (const account of inputs.liabilityAccounts) {
    if (!isLiabilityAccountType(account.accountType)) continue;
    if (account.currentBalance === null || Number(account.currentBalance) === 0) continue;

    const key = `reduce-debt:${account.id}`;
    if (takenKeys.has(key)) continue;

    const balance = Math.abs(Number(account.currentBalance));
    candidates.push({
      missionType: "reduce-debt",
      title: `Pay Off ${account.name}`,
      description: "Pay down this balance toward zero.",
      relatedAccountId: account.id,
      preview: computeReduceDebtProgress(balance, balance),
    });
  }

  // ---- improve-confidence ------------------------------------------------
  if (inputs.confidenceOverallScore !== null && !takenKeys.has("improve-confidence:")) {
    const target = nextBandUp(inputs.confidenceOverallScore);
    if (target) {
      candidates.push({
        missionType: "improve-confidence",
        title: `Reach the ${target.label} Confidence Band`,
        description: "Build real financial evidence — savings, debt reduction, consistent habits — to raise your Confidence Score.",
        targetBandId: target.id,
        preview: {
          currentValue: inputs.confidenceOverallScore,
          targetValue: target.min,
          percentComplete: 0,
          isComplete: false,
          explanation: `Currently ${inputs.confidenceOverallScore}. Reaching ${target.min} moves you into the ${target.label} band.`,
        },
      });
    }
  }

  return candidates;
}
