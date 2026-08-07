import type { GoalHealth } from "@/application/goals/goal-calculations";
import type { GoalPriority, GoalStatus, GoalType } from "@/domains/goals/types";

// Presentation-shaped view model for the Goals workspace, kept outside
// src/composition/ (server-only) so "use client" components can import
// this *type* without pulling in a composition-root module — same pattern
// as Transactions/Accounts/Budgets/Reports.

// One funding source attached to a goal — a single goal_allocations row,
// joined with its account for display. accountBalance/unallocatedBalance
// are account-level facts (how much of the WHOLE account is free right
// now), not goal-level — the same account appearing as a funding source on
// two different goals shows the same unallocatedBalance on both rows,
// since it reflects what's left for a *third* goal to draw from.
export interface GoalFundingSourceRow {
  allocationId: string;
  accountId: string;
  accountName: string;
  accountType: string;
  allocatedAmount: number;
  accountBalance: number;
  unallocatedBalance: number;
  // True only if this account's total allocations now exceed its current
  // balance — reachable only if the balance was reduced after allocations
  // were made (see AccountAllocationSummary's comment in
  // goal-calculations.ts). A real, honest warning, not a fabricated one.
  isOverCommitted: boolean;
  // From account.closingDate where present — the closest thing this
  // codebase's Accounts model has to a CD maturity date; null for
  // accounts with none set, never fabricated.
  maturityDateLabel: string | null;
  // From account.updatedAt — "how fresh is the balance this allocation is
  // measured against."
  freshnessLabel: string;
  notes: string | null;
}

export interface AllocatableAccountOption {
  id: string;
  name: string;
  accountType: string;
  unallocatedBalance: number;
  maturityDateLabel: string | null;
}

export interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  goalType: GoalType;
  status: GoalStatus;
  priority: GoalPriority;
  icon: string | null;
  color: string | null;
  targetAmount: number;
  // Total recognized progress = allocatedAmount + manualContributionsAmount
  // (ADR-0003's Current Goal Value, minus the not-yet-implemented
  // Supported Asset Value term) — see goal-calculations.ts.
  currentAmount: number;
  // The breakdown behind currentAmount — surfaced separately so the UI
  // (and this report's reconciliation) can show "$X from linked accounts,
  // $Y manually reported" rather than one opaque total.
  allocatedAmount: number;
  manualContributionsAmount: number;
  remainingAmount: number;
  // Clamped to [0, 100] for the progress bar; the underlying unclamped
  // number from goal-calculations.ts is only used for health/overfunding
  // logic, never rendered directly.
  percentCompleteDisplay: number;
  health: GoalHealth;
  targetDateLabel: string | null;
  completedDateLabel: string | null;
  categoryName: string | null;
  accountName: string | null;
  fundingSources: GoalFundingSourceRow[];
  // Archived goals are frozen — see GoalService.EDITABLE_STATUSES.
  isEditable: boolean;
  // status is Active or Completed — see GoalService.FUNDABLE_STATUSES. A
  // Paused goal is still editable (isEditable) but not fundable: it can be
  // renamed or retargeted, just not given new contributions/allocations
  // until resumed. This is what actually hides the "Add Contribution"/
  // "Allocate Funds" buttons for a paused goal, distinct from isEditable.
  canFund: boolean;
  // Active and currentAmount already meets targetAmount — the "Complete"
  // action becomes reachable exactly when this is true, never sooner.
  canComplete: boolean;
  // status === "active" — the "Pause" action's reachability.
  canPause: boolean;
  // status === "paused" — the "Resume" action's reachability.
  canResume: boolean;
}

export interface UpcomingObjectiveRow {
  goalId: string;
  title: string;
  percentCompleteDisplay: number;
  reason: string;
}

export interface GoalContributionRow {
  id: string;
  goalId: string;
  goalTitle: string;
  amount: number;
  dateLabel: string;
  note: string | null;
}

export interface GoalsOverviewMetricsView {
  totalGoals: number;
  totalSaved: number;
  averageProgress: number;
  onTrackCount: number;
}

export interface GoalHealthSummary {
  excellent: number;
  onTrack: number;
  behind: number;
  completed: number;
}

export interface LinkableAccountOption {
  id: string;
  name: string;
}

export interface LinkableCategoryOption {
  id: string;
  name: string;
  parentCategoryId: string | null;
}

export interface GoalsOverviewView {
  hasGoals: boolean;
  goals?: GoalRow[];
  metrics?: GoalsOverviewMetricsView;
  healthSummary?: GoalHealthSummary;
  recentContributions?: GoalContributionRow[];
  linkableAccounts?: LinkableAccountOption[];
  linkableCategories?: LinkableCategoryOption[];
  // Every eligible-type, active account with a known balance, and its
  // current unallocated balance — the option list for the "Allocate
  // Funds" dialog, recomputed on every read (never cached), so it's
  // always the true available-to-allocate figure at the moment the
  // dialog opens.
  allocatableAccounts?: AllocatableAccountOption[];
  // Derived from the same GoalProgress list everything else on this view
  // model comes from (see deriveUpcomingObjectives in goal-calculations.ts)
  // — the Dashboard's "Upcoming Objectives" widget renders this directly,
  // never a second, independent calculation.
  upcomingObjectives?: UpcomingObjectiveRow[];
}
