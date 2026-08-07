import type {
  Goal,
  GoalAllocation,
  GoalContribution,
  GoalContributionSource,
  GoalPriority,
  GoalStatus,
  GoalType,
  NewGoal,
  NewGoalAllocation,
  NewGoalContribution,
} from "@/db/schema/goals";

export type { Goal, GoalAllocation, GoalContribution, GoalContributionSource, GoalPriority, GoalStatus, GoalType };

export type GoalCreateInput = Omit<
  NewGoal,
  "id" | "status" | "displayOrder" | "completedAt" | "createdAt" | "updatedAt" | "deletedAt"
>;

// title/description/targetAmount/targetDate/goalType/priority/icon/color/
// category/account are all editable while a goal is active, paused, or
// completed; status, completedAt, and displayOrder change only through the
// dedicated lifecycle methods below, never through a generic edit.
export type GoalUpdateInput = Partial<
  Pick<
    NewGoal,
    | "title"
    | "description"
    | "targetAmount"
    | "targetDate"
    | "goalType"
    | "priority"
    | "icon"
    | "color"
    | "categoryId"
    | "accountId"
  >
>;

export type GoalStatusUpdateInput = { status: GoalStatus; completedAt?: Date | null };

export type GoalContributionCreateInput = Omit<NewGoalContribution, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export type GoalContributionUpdateInput = Partial<Pick<NewGoalContribution, "amount" | "contributionDate" | "note">>;

export type GoalAllocationCreateInput = Omit<NewGoalAllocation, "id" | "createdAt" | "updatedAt" | "deletedAt">;

// account_id/goal_id are immutable once an allocation exists — see
// goals.ts's schema comment; only amount is ever edited.
export type GoalAllocationUpdateInput = Pick<NewGoalAllocation, "amount">;
