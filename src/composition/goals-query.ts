import "server-only";

import { computeAccountAllocationSummary, deriveUpcomingObjectives, type GoalProgress } from "@/application/goals/goal-calculations";
import type {
  AllocatableAccountOption,
  GoalContributionRow,
  GoalFundingSourceRow,
  GoalHealthSummary,
  GoalRow,
  GoalsOverviewView,
  UpcomingObjectiveRow,
} from "@/application/goals/goals-views";
import { ELIGIBLE_ALLOCATION_ACCOUNT_TYPES } from "@/application/goals/service";
import type { Account } from "@/domains/accounts/types";
import type { GoalAllocation } from "@/domains/goals/types";

import { getAccountService } from "./accounts-composition";
import { getCategoryService } from "./categories-composition";
import { getGoalService } from "./goals-composition";

export type { GoalsOverviewView };

function formatDateLabel(dateString: string): string {
  return new Date(`${dateString}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTimeLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const HEALTH_LABEL_KEY: Record<GoalProgress["health"], keyof GoalHealthSummary> = {
  excellent: "excellent",
  "on-track": "onTrack",
  behind: "behind",
  completed: "completed",
};

function toGoalRow(
  progress: GoalProgress,
  categoryNameById: Map<string, string>,
  accountNameById: Map<string, string>,
  fundingSourcesByGoalId: Map<string, GoalFundingSourceRow[]>,
): GoalRow {
  const { goal } = progress;
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    goalType: goal.goalType,
    status: goal.status,
    priority: goal.priority,
    icon: goal.icon,
    color: goal.color,
    targetAmount: progress.targetAmount,
    currentAmount: progress.currentAmount,
    allocatedAmount: progress.allocatedAmount,
    manualContributionsAmount: progress.manualContributionsAmount,
    remainingAmount: progress.remainingAmount,
    percentCompleteDisplay: Math.min(100, Math.max(0, progress.percentComplete)),
    health: progress.health,
    targetDateLabel: goal.targetDate ? formatDateLabel(goal.targetDate) : null,
    completedDateLabel: progress.completedDate ? formatDateLabel(progress.completedDate) : null,
    categoryName: goal.categoryId ? (categoryNameById.get(goal.categoryId) ?? null) : null,
    accountName: goal.accountId ? (accountNameById.get(goal.accountId) ?? null) : null,
    fundingSources: fundingSourcesByGoalId.get(goal.id) ?? [],
    isEditable: goal.status !== "archived",
    canFund: goal.status === "active" || goal.status === "completed",
    canComplete: goal.status === "active" && progress.currentAmount >= progress.targetAmount,
    canPause: goal.status === "active",
    canResume: goal.status === "paused",
  };
}

function groupBy<T, K>(items: T[], keyOf: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

// Same role as budgets-query.ts / dashboard-query.ts: combine GoalService
// reads into a presentation-ready view model. No JSX, no try/catch — errors
// propagate to the route's error boundary.
export async function getGoalsOverview(ownerId: string): Promise<GoalsOverviewView> {
  const goalService = getGoalService();

  // Accounts/categories are fetched unconditionally — the "Create Goal"
  // dialog's optional account/category picker (and the "Allocate Funds"
  // dialog's eligible-account picker) needs these options even before the
  // owner has a single goal yet, unlike the rest of this view model which
  // is only meaningful once goals exist.
  const [progressList, categories, accounts, allocations] = await Promise.all([
    goalService.listGoalsWithProgress(ownerId),
    getCategoryService().listCategories(ownerId),
    getAccountService().listAccounts(ownerId),
    goalService.listAllAllocations(ownerId),
  ]);

  const linkableAccounts = accounts.map((account) => ({ id: account.id, name: account.name }));
  const linkableCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
    parentCategoryId: category.parentCategoryId,
  }));

  // Every active allocation, grouped by the account it draws from — the
  // authoritative "how much of this account is already spoken for," used
  // both to build each funding source's unallocatedBalance/isOverCommitted
  // and the allocatable-accounts picker. Computed once here, not
  // per-goal, so a shared account never disagrees with itself across two
  // goal rows.
  const accountsById = new Map<string, Account>(accounts.map((account) => [account.id, account]));
  const allocationsByAccountId = groupBy(allocations, (allocation) => allocation.accountId);
  const accountSummaryById = new Map(
    accounts.map((account) => [
      account.id,
      computeAccountAllocationSummary(
        account.id,
        account.currentBalance === null ? null : Number(account.currentBalance),
        allocationsByAccountId.get(account.id) ?? [],
      ),
    ]),
  );

  function toFundingSourceRow(allocation: GoalAllocation): GoalFundingSourceRow | null {
    const account = accountsById.get(allocation.accountId);
    const summary = accountSummaryById.get(allocation.accountId);
    if (!account || !summary) return null;

    return {
      allocationId: allocation.id,
      accountId: account.id,
      accountName: account.name,
      accountType: account.accountType,
      allocatedAmount: Number(allocation.amount),
      accountBalance: summary.availableBalance,
      unallocatedBalance: summary.unallocatedBalance,
      isOverCommitted: summary.isOverCommitted,
      maturityDateLabel: account.closingDate ? formatDateLabel(account.closingDate) : null,
      freshnessLabel: `Updated ${formatDateTimeLabel(account.updatedAt)}`,
      notes: account.notes,
    };
  }

  const fundingSourcesByGoalId = new Map<string, GoalFundingSourceRow[]>();
  for (const allocation of allocations) {
    const row = toFundingSourceRow(allocation);
    if (!row) continue;
    const bucket = fundingSourcesByGoalId.get(allocation.goalId);
    if (bucket) {
      bucket.push(row);
    } else {
      fundingSourcesByGoalId.set(allocation.goalId, [row]);
    }
  }

  // Eligible, active, balance-known accounts and their current unallocated
  // balance — the "Allocate Funds" dialog's option list. Recomputed on
  // every read, never cached, so it always reflects the true
  // available-to-allocate figure (ADR-0003).
  const allocatableAccounts: AllocatableAccountOption[] = accounts
    .filter(
      (account) =>
        account.status === "active" &&
        ELIGIBLE_ALLOCATION_ACCOUNT_TYPES.has(account.accountType) &&
        account.currentBalance !== null,
    )
    .map((account) => {
      const summary = accountSummaryById.get(account.id)!;
      return {
        id: account.id,
        name: account.name,
        accountType: account.accountType,
        unallocatedBalance: summary.unallocatedBalance,
        maturityDateLabel: account.closingDate ? formatDateLabel(account.closingDate) : null,
      };
    });

  if (progressList.length === 0) {
    return { hasGoals: false, linkableAccounts, linkableCategories, allocatableAccounts };
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]));

  // Sorted by the same displayOrder/createdAt convention as the
  // repository's listForOwner — progressList already inherits that order
  // since it maps 1:1 over listForOwner's result.
  const goalRows = progressList.map((progress) =>
    toGoalRow(progress, categoryNameById, accountNameById, fundingSourcesByGoalId),
  );

  // Archived goals are excluded from totals — goals-specification.md §4:
  // "Archived: hidden from dashboards while preserving historical
  // information." They still appear in the goals list itself (no History
  // tab exists yet in this slice to view them elsewhere), just not counted.
  const countedProgress = progressList.filter((progress) => progress.goal.status !== "archived");

  const totalGoals = countedProgress.length;
  const totalSaved = countedProgress.reduce((sum, progress) => sum + progress.currentAmount, 0);
  const averageProgress =
    totalGoals === 0
      ? 0
      : countedProgress.reduce((sum, progress) => sum + Math.min(100, Math.max(0, progress.percentComplete)), 0) /
        totalGoals;
  const activeProgress = countedProgress.filter((progress) => progress.goal.status === "active");
  const onTrackCount = activeProgress.filter(
    (progress) => progress.health === "excellent" || progress.health === "on-track",
  ).length;

  const healthSummary: GoalHealthSummary = { excellent: 0, onTrack: 0, behind: 0, completed: 0 };
  for (const progress of countedProgress) {
    healthSummary[HEALTH_LABEL_KEY[progress.health]] += 1;
  }

  const goalTitleById = new Map(progressList.map((progress) => [progress.goal.id, progress.goal.title]));
  const recentContributionRows = await goalService.listRecentContributions(ownerId, 5);
  const recentContributions: GoalContributionRow[] = recentContributionRows.map((contribution) => ({
    id: contribution.id,
    goalId: contribution.goalId,
    goalTitle: goalTitleById.get(contribution.goalId) ?? "Unknown Goal",
    amount: Number(contribution.amount),
    dateLabel: formatDateLabel(contribution.contributionDate),
    note: contribution.note,
  }));

  // Same progressList everything else on this view model derives from —
  // the Dashboard's Upcoming Objectives widget is never a second,
  // independent calculation (Issue #53 requirement).
  const upcomingObjectives: UpcomingObjectiveRow[] = deriveUpcomingObjectives(progressList).map((objective) => ({
    goalId: objective.goalId,
    title: objective.title,
    percentCompleteDisplay: objective.percentComplete,
    reason: objective.reason,
  }));

  return {
    hasGoals: true,
    goals: goalRows,
    metrics: { totalGoals, totalSaved, averageProgress, onTrackCount },
    healthSummary,
    recentContributions,
    linkableAccounts,
    linkableCategories,
    allocatableAccounts,
    upcomingObjectives,
  };
}
