import { getAccountPresentation } from "@/application/dashboard/account-presentation";
import { CONFIDENCE_BANDS, type ConfidenceBandId, type ConfidencePillarId } from "@/application/confidence/confidence-calculations";
import type { BudgetPeriodTotals } from "@/application/budgets/budget-calculations";
import type { GoalProgress } from "@/application/goals/goal-calculations";
import type { AccountType } from "@/domains/accounts/types";
import type { BudgetPeriodStatus } from "@/domains/budgets/types";
import type { MissionType } from "@/domains/missions/types";

// Pure calculation layer — no repository/DB dependency, the single
// canonical location for Mission progress math. Every function here reads
// output another domain's own service/calculation layer already produced
// (GoalProgress from goal-calculations.ts, BudgetPeriodTotals from
// budget-calculations.ts, ConfidenceResult from confidence-calculations.ts)
// — nothing here re-derives spending, goal funding, debt, or confidence
// math from raw transactions/accounts itself. That is the literal
// "never duplicate business logic already implemented in those domains"
// requirement this file exists to satisfy.

export interface MissionProgress {
  currentValue: number;
  targetValue: number;
  // Clamped to [0, 100] — the same display convention as Goals/Budgets.
  percentComplete: number;
  isComplete: boolean;
  // The deterministic "why" behind the current progress state — every
  // mission type's explanation is built from the exact numbers above,
  // never a separate narrative.
  explanation: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

// ---- stay-within-budget ---------------------------------------------------

// Completion is tied to BudgetService's own real "Complete Period"
// lifecycle transition (an explicit, already-existing action), never a
// continuous "currently under budget" snapshot — a budget mission answers
// "did this period finish within budget," not "are you under budget right
// now," which could otherwise flip complete/incomplete moment to moment
// as spending happens throughout the period.
export function computeStayWithinBudgetProgress(
  periodStatus: BudgetPeriodStatus,
  totals: BudgetPeriodTotals,
): MissionProgress {
  const currentValue = totals.overallProgress;
  const targetValue = 100;
  const percentComplete = clamp(currentValue, 0, 100);
  const isComplete = periodStatus === "completed" && totals.overallProgress <= 100;

  const explanation = isComplete
    ? `Period closed at ${formatPercent(totals.overallProgress)} of the planned budget — you stayed within budget.`
    : totals.overallProgress <= 100
      ? `${formatPercent(totals.overallProgress)} of this period's budget spent so far. Stay at or under 100% through period end to complete this mission.`
      : `${formatPercent(totals.overallProgress)} of this period's budget spent — over the planned amount. This mission completes only if the period closes at or under 100%.`;

  return { currentValue, targetValue, percentComplete, isComplete, explanation };
}

// ---- fund-emergency-fund / reach-savings-goal -----------------------------

// Identical math for both mission types — the only difference between them
// is which goals are eligible (see mission-eligibility.ts), never the
// progress formula. Reuses GoalProgress verbatim; the >= threshold matches
// GoalService.completeGoal's own gate exactly.
export function computeGoalMissionProgress(progress: GoalProgress): MissionProgress {
  const currentValue = progress.currentAmount;
  const targetValue = progress.targetAmount;
  const percentComplete = clamp(progress.percentComplete, 0, 100);
  const isComplete = targetValue > 0 && currentValue >= targetValue;

  const explanation = isComplete
    ? `${formatCurrency(targetValue)} funded — target reached.`
    : `${formatCurrency(currentValue)} of ${formatCurrency(targetValue)} funded (${formatPercent(percentComplete)}).`;

  return { currentValue, targetValue, percentComplete, isComplete, explanation };
}

// ---- categorize-transactions -----------------------------------------------

// targetTransactionIds is the exact snapshot captured when the mission
// started (missions-specification.md §8: progress must never be inferred
// from unrelated activity — a transaction imported or newly uncategorized
// after the mission started never joins its scope). currentlyUncategorizedIds
// is a fresh read of what's uncategorized right now; a snapshotted id no
// longer in that set has been categorized (or removed) since the mission
// began.
export function computeCategorizeTransactionsProgress(
  targetTransactionIds: string[],
  currentlyUncategorizedIds: ReadonlySet<string>,
): MissionProgress {
  const targetValue = targetTransactionIds.length;
  const currentValue = targetTransactionIds.filter((id) => !currentlyUncategorizedIds.has(id)).length;
  const percentComplete = targetValue > 0 ? clamp((currentValue / targetValue) * 100, 0, 100) : 100;
  const isComplete = targetValue === 0 || currentValue >= targetValue;

  const explanation = isComplete
    ? `All ${targetValue} transaction${targetValue === 1 ? "" : "s"} from this mission are categorized.`
    : `${currentValue} of ${targetValue} transactions categorized (${formatPercent(percentComplete)}).`;

  return { currentValue, targetValue, percentComplete, isComplete, explanation };
}

// ---- reduce-debt -----------------------------------------------------------

// LIABILITY_GROUPS reuse of net-worth-breakdown.ts's own classification
// (via getAccountPresentation) — never a second, independently-maintained
// list of "which account types are debt."
export function isLiabilityAccountType(accountType: AccountType): boolean {
  const { group } = getAccountPresentation(accountType);
  return group === "Credit" || group === "Loans";
}

// startBalance is the liability's absolute balance captured when the
// mission started; currentBalance is read fresh from the account each
// evaluation. Balances on liability accounts are stored/interpreted as a
// magnitude owed (net-worth-breakdown.ts takes Math.abs() the same way),
// so both are normalized the same way here.
export function computeReduceDebtProgress(startBalance: number, currentBalance: number): MissionProgress {
  const startAbs = Math.abs(startBalance);
  const currentAbs = Math.abs(currentBalance);
  const targetValue = 0;
  const percentComplete = startAbs > 0 ? clamp(((startAbs - currentAbs) / startAbs) * 100, 0, 100) : currentAbs <= 0 ? 100 : 0;
  const isComplete = currentAbs <= 0;

  const explanation = isComplete
    ? `Balance paid down from ${formatCurrency(startAbs)} to $0 — paid off.`
    : currentAbs < startAbs
      ? `Balance down to ${formatCurrency(currentAbs)} from ${formatCurrency(startAbs)} (${formatPercent(percentComplete)} paid down).`
      : `Balance is ${formatCurrency(currentAbs)}, at or above the ${formatCurrency(startAbs)} starting balance — no reduction yet.`;

  return { currentValue: currentAbs, targetValue, percentComplete, isComplete, explanation };
}

// ---- improve-confidence -----------------------------------------------------

// The next band strictly above `score`, or null if already in the top
// band (CONFIDENCE_BANDS is ordered highest-to-lowest by min threshold —
// see confidence-calculations.ts). Reused for both eligibility (is there a
// next band to target at all) and the mission's own startValue/targetValue
// capture — never a second band table.
export function nextBandUp(score: number): { id: ConfidenceBandId; label: string; min: number } | null {
  const clamped = clamp(score, 0, 100);
  const currentIndex = CONFIDENCE_BANDS.findIndex((band) => clamped >= band.min && clamped <= band.max);
  if (currentIndex <= 0) return null;
  const band = CONFIDENCE_BANDS[currentIndex - 1];
  return { id: band.id, label: band.label, min: band.min };
}

// currentScore is read fresh from computeCurrentConfidenceScore
// (confidence-query.ts) every evaluation — this function never computes a
// confidence score itself, only compares the live, real number the
// Confidence Engine already produced against the target band captured at
// mission start. The Confidence Score itself is never written to or
// influenced by this mission in any way.
export function computeImproveConfidenceProgress(
  startValue: number,
  targetValue: number,
  targetBandLabel: string,
  currentScore: number | null,
): MissionProgress {
  if (currentScore === null) {
    return {
      currentValue: startValue,
      targetValue,
      percentComplete: 0,
      isComplete: false,
      explanation: "Your Confidence Score isn't available right now.",
    };
  }

  const span = targetValue - startValue;
  const percentComplete = span > 0 ? clamp(((currentScore - startValue) / span) * 100, 0, 100) : currentScore >= targetValue ? 100 : 0;
  const isComplete = currentScore >= targetValue;

  const explanation = isComplete
    ? `Confidence Score reached ${currentScore} — now in the ${targetBandLabel} band.`
    : `Confidence Score is ${currentScore}, started at ${startValue}. Reaching ${targetValue} moves you into the ${targetBandLabel} band.`;

  return { currentValue: currentScore, targetValue, percentComplete, isComplete, explanation };
}

// ---- Confidence Integration (display-only) ---------------------------------

// Which Confidence Engine pillar each mission type most directly supports
// — missions-specification.md §15's "Relationship to the Confidence
// Engine," mapped onto this codebase's real, shipped pillar ids (not the
// docs' own dimension names, which predate this pillar set and don't
// match it 1:1 — see the PR description for the reconciliation). Display/
// explanation only: nothing here feeds back into confidence-calculations.ts,
// and completing a mission never directly changes a pillar score. improve-
// confidence targets the overall score, not one pillar, so it maps to null.
export const MISSION_TYPE_PILLAR: Record<MissionType, ConfidencePillarId | null> = {
  "stay-within-budget": "cashFlow",
  "fund-emergency-fund": "resilience",
  "reach-savings-goal": "savings",
  "categorize-transactions": "financialHabits",
  "reduce-debt": "debtHealth",
  "improve-confidence": null,
  // A custom mission is user-defined and has no real financial dimension
  // of its own to point at.
  custom: null,
};

// ---- custom (user-confirmed) -----------------------------------------

// The one mission type with no real-data source: progress is purely
// binary, driven entirely by status, never computed from Goals/Budgets/
// Accounts/Transactions/Confidence. isComplete only ever becomes true
// through MissionService's explicit completeCustomMission action (a real
// user click), never through the auto-evaluation loop every other mission
// type goes through.
export function computeCustomMissionProgress(status: "active" | "completed" | "archived"): MissionProgress {
  const isComplete = status !== "active";
  return {
    currentValue: isComplete ? 1 : 0,
    targetValue: 1,
    percentComplete: isComplete ? 100 : 0,
    isComplete,
    explanation: isComplete
      ? "You marked this mission complete."
      : "This is your own mission — mark it complete whenever you've done it. Athena can't verify it automatically.",
  };
}
