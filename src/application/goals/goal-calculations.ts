import type { Goal, GoalAllocation, GoalContribution } from "@/domains/goals/types";

// Pure calculation layer — no repository/DB dependency, trivially
// unit-testable with plain fixtures, and the single canonical location for
// all Goal math (task requirement: "Keep all Goal math in one canonical
// location"). Mirrors budget-calculations.ts's standalone-function shape.
//
// ADR-0003 (Goal Allocation Model): "Current Goal Value = Allocated Funds +
// Verified Contributions + Supported Asset Value." Allocated Funds and
// Verified Contributions are the two implemented terms here (Supported
// Asset Value — e.g. CD/investment appreciation attributed to a goal — is
// out of scope; see docs/adr/0003-goal-allocation-model.md's Future Asset
// Types section). They are summed, never merged into one ledger: an
// allocation is a claim against money that already, verifiably, sits in a
// real account (see computeAccountAllocationSummary below, which is what
// keeps that claim honest — an account can never have more allocated
// against it than its own balance); a manual contribution is a
// user-reported entry for money not tracked in any linked account (cash,
// a gift, or a pre-allocation historical entry). Because they are
// disjoint by construction — one is "this real account balance is spoken
// for," the other is "the user told us about this money directly" — no
// dollar can appear in both, and no runtime de-duplication step is
// possible or necessary.

export const GOAL_HEALTHS = ["excellent", "on-track", "behind", "completed"] as const;
export type GoalHealth = (typeof GOAL_HEALTHS)[number];

export interface GoalProgress {
  goal: Goal;
  // SUM(non-deleted goal_allocations.amount) for this goal — money that
  // verifiably sits in a real, owned account, claimed for this goal.
  allocatedAmount: number;
  // SUM(non-deleted goal_contributions.amount) for this goal — user-
  // reported activity not backed by a live account allocation.
  manualContributionsAmount: number;
  // Total recognized progress = allocatedAmount + manualContributionsAmount
  // (ADR-0003's "Current Goal Value", minus the not-yet-implemented
  // Supported Asset Value term). Never a stored column on Goal itself —
  // always derived at read time from both ledgers (task requirement: "Do
  // NOT directly mutate current balance").
  currentAmount: number;
  targetAmount: number;
  // Unclamped by design (same convention as budget-calculations.ts's
  // BudgetPeriodTotals.overallProgress) — a negative remainingAmount or a
  // percentComplete above 100 is the honest "overfunded" state; callers
  // clamp only for display (e.g. a progress bar).
  remainingAmount: number;
  percentComplete: number;
  health: GoalHealth;
  // V1 has no forecasting engine (task requirement: "placeholder if future
  // forecasting isn't implemented") — always null until a real projection
  // model exists. Never fabricated from a naive linear extrapolation.
  projectedCompletionDate: null;
  completedDate: string | null;
}

// Sum of every non-deleted contribution for one goal. Callers pass only the
// contributions already scoped to this goal (see GoalService, which groups
// a batch fetch by goalId rather than issuing one query per goal).
export function computeCurrentAmount(contributions: GoalContribution[]): number {
  return contributions.reduce((sum, contribution) => sum + Number(contribution.amount), 0);
}

// Sum of every non-deleted allocation for one goal, across however many
// funding-source accounts it draws from. Callers pass only the allocations
// already scoped to this goal — same batched-fetch convention as
// computeCurrentAmount.
export function computeAllocatedAmount(allocations: GoalAllocation[]): number {
  return allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
}

// Goal Health V1 (task requirement: "simple V1... no forecasting engine
// yet... explainable deterministic rules"):
//   - status === "completed" always overrides to "completed" regardless of
//     pace — a finished goal's health isn't a race against its own target
//     date.
//   - with a targetDate: compare actual percentComplete against the
//     percent of elapsed time (expectedPercent), banded by ±10 points —
//     >=10 ahead of pace is "excellent", >=10 behind is "behind",
//     otherwise "on-track".
//   - without a targetDate: flat percent thresholds (>=75 excellent,
//     25-75 on-track, <25 behind) — there's no pace to compare against.
export function computeGoalHealth(
  goal: Pick<Goal, "status" | "targetDate" | "createdAt">,
  percentComplete: number,
  asOf: Date = new Date(),
): GoalHealth {
  if (goal.status === "completed") return "completed";

  if (goal.targetDate) {
    const start = goal.createdAt.getTime();
    const end = new Date(`${goal.targetDate}T00:00:00Z`).getTime();
    const totalDays = end - start;

    const expectedPercent =
      totalDays <= 0 ? 100 : clamp(((asOf.getTime() - start) / totalDays) * 100, 0, 100);

    if (percentComplete >= expectedPercent + 10) return "excellent";
    if (percentComplete >= expectedPercent - 10) return "on-track";
    return "behind";
  }

  if (percentComplete >= 75) return "excellent";
  if (percentComplete >= 25) return "on-track";
  return "behind";
}

export function computeGoalProgress(
  goal: Goal,
  contributions: GoalContribution[],
  allocations: GoalAllocation[],
  asOf: Date = new Date(),
): GoalProgress {
  const allocatedAmount = computeAllocatedAmount(allocations);
  const manualContributionsAmount = computeCurrentAmount(contributions);
  const currentAmount = allocatedAmount + manualContributionsAmount;
  const targetAmount = Number(goal.targetAmount);
  const percentComplete = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

  return {
    goal,
    allocatedAmount,
    manualContributionsAmount,
    currentAmount,
    targetAmount,
    remainingAmount: targetAmount - currentAmount,
    percentComplete,
    health: computeGoalHealth(goal, percentComplete, asOf),
    projectedCompletionDate: null,
    completedDate: goal.completedAt ? goal.completedAt.toISOString().slice(0, 10) : null,
  };
}

// ---- Account-side allocation math (ADR-0003 "Available to Allocate") ----

export interface AccountAllocationSummary {
  accountId: string;
  // The account's own current_balance (0 if unset — an account with no
  // balance recorded has, by definition, $0 known-available to allocate;
  // GoalService independently refuses to *create* a new allocation
  // against such an account rather than silently treating it as $0 here,
  // since a $0 balance and an unknown one are different facts).
  availableBalance: number;
  // Sum of every active allocation against this account, across every
  // goal that draws from it — never scoped to a single goal.
  allocatedAmount: number;
  // availableBalance - allocatedAmount. Unclamped: a negative value means
  // this account is over-committed relative to its *current* balance —
  // reachable only if the balance was reduced after allocations were
  // already made (the goal_allocations_no_overallocation trigger prevents
  // it at allocation-write time, but never retroactively re-validates
  // existing allocations against a later balance change). Surfaced as an
  // honest warning, not hidden.
  unallocatedBalance: number;
  isOverCommitted: boolean;
}

export function computeAccountAllocationSummary(
  accountId: string,
  currentBalance: number | null,
  allocationsForAccount: GoalAllocation[],
): AccountAllocationSummary {
  const availableBalance = currentBalance ?? 0;
  const allocatedAmount = allocationsForAccount.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
  const unallocatedBalance = availableBalance - allocatedAmount;

  return {
    accountId,
    availableBalance,
    allocatedAmount,
    unallocatedBalance,
    isOverCommitted: unallocatedBalance < 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ---- Upcoming Objective derivation (Issue #53) ---------------------------
//
// Deterministic, explainable selection — no AI, no scoring formula. Each
// active goal is checked against a fixed list of candidate reasons, in a
// fixed order; the first one that matches is the reason used, so a goal
// never produces more than one objective. That same check order doubles as
// the urgency ranking used to sort and cap the final list:
//   1. Near completion — the most immediately actionable ("finish this").
//   2. Behind pace — a goal actively falling behind its own target date.
//   3. Approaching target date — a heads-up before it becomes "behind."
//   4. High priority — a user-tagged goal with no other more urgent signal.
// Paused, Completed, and Archived goals never generate an objective:
// Paused is explicitly excluded per the task requirement (a goal the user
// deliberately stopped funding shouldn't nag them), and Completed/Archived
// goals have nothing left to work toward.

const NEAR_COMPLETION_THRESHOLD_PERCENT = 90;
const APPROACHING_TARGET_DATE_DAYS = 60;
const MAX_UPCOMING_OBJECTIVES = 4;

export interface UpcomingGoalObjective {
  goalId: string;
  title: string;
  // Clamped to [0, 100] — the same display convention as everywhere else
  // a percent is shown to a user.
  percentComplete: number;
  reason: string;
}

export function deriveUpcomingObjectives(
  progressList: GoalProgress[],
  asOf: Date = new Date(),
): UpcomingGoalObjective[] {
  const candidates: (UpcomingGoalObjective & { rank: number })[] = [];

  for (const progress of progressList) {
    const { goal } = progress;
    if (goal.status !== "active") continue;

    const percentComplete = clamp(progress.percentComplete, 0, 100);
    let reason: string | null = null;
    let rank = 3;

    if (percentComplete >= NEAR_COMPLETION_THRESHOLD_PERCENT) {
      reason = `${Math.round(percentComplete)}% funded — almost there.`;
      rank = 0;
    } else if (progress.health === "behind") {
      reason = "Behind pace toward its target date.";
      rank = 1;
    } else if (goal.targetDate) {
      const daysUntil = Math.ceil(
        (new Date(`${goal.targetDate}T00:00:00Z`).getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntil >= 0 && daysUntil <= APPROACHING_TARGET_DATE_DAYS) {
        reason = `Target date in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`;
        rank = 2;
      }
    }

    if (reason === null && goal.priority === "high") {
      reason = "Marked as a high priority goal.";
      rank = 3;
    }

    if (reason === null) continue;

    candidates.push({ goalId: goal.id, title: goal.title, percentComplete, reason, rank });
  }

  // Rank first (urgency), then title alphabetically as a deterministic
  // tie-breaker — never insertion order, which would depend on however
  // the caller's list happened to be sorted.
  candidates.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.title.localeCompare(b.title)));

  return candidates
    .slice(0, MAX_UPCOMING_OBJECTIVES)
    .map(({ goalId, title, percentComplete, reason }) => ({ goalId, title, percentComplete, reason }));
}
