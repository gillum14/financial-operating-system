import { AlertTriangle, ChevronDown, Landmark, Target } from "lucide-react";

import type { AllocatableAccountOption, GoalRow } from "@/application/goals/goals-views";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import {
  GOAL_HEALTH_LABELS,
  GOAL_PRIORITY_LABELS,
  GOAL_TYPE_ICONS,
  GOAL_TYPE_LABELS,
  goalHealthTone,
  goalPriorityTone,
  resolveGoalColor,
} from "@/lib/goal-presentation";

import { AllocationRowControls } from "./allocation-row-controls";
import { GoalRowControls } from "./goal-row-controls";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const STATUS_LABEL: Record<GoalRow["status"], string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

// The breakdown behind currentAmount — ADR-0003's "Current Goal Value =
// Allocated Funds + Verified Contributions." Only rendered when both
// ledgers are non-zero; a goal funded entirely one way doesn't need a
// breakdown line explaining a split that isn't happening.
function ProgressBreakdown({ goal }: { goal: GoalRow }) {
  if (goal.allocatedAmount === 0 || goal.manualContributionsAmount === 0) return null;
  return (
    <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
      {formatCurrency(goal.allocatedAmount)} allocated + {formatCurrency(goal.manualContributionsAmount)} manual
    </p>
  );
}

function FundingSourcesList({ goal }: { goal: GoalRow }) {
  if (goal.fundingSources.length === 0) return null;

  return (
    <div className="mt-3 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground-secondary)]">
        <Landmark className="h-3.5 w-3.5" strokeWidth={1.75} />
        Funding sources
      </p>
      <ul className="space-y-2">
        {goal.fundingSources.map((source) => (
          <li key={source.allocationId} className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <span className="truncate font-medium text-[var(--foreground)]">{source.accountName}</span>
              {source.maturityDateLabel && <span className="ml-1.5 text-[var(--foreground-muted)]">· Matures {source.maturityDateLabel}</span>}
              {source.isOverCommitted && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-[var(--danger)]">
                  <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                  Over-committed
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-medium text-[var(--foreground-secondary)]">{formatCurrency(source.allocatedAmount)}</span>
              <AllocationRowControls allocationId={source.allocationId} amount={source.allocatedAmount} accountName={source.accountName} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoalListItem({ goal, allocatableAccounts }: { goal: GoalRow; allocatableAccounts: AllocatableAccountOption[] }) {
  const Icon = GOAL_TYPE_ICONS[goal.goalType];
  const color = resolveGoalColor(goal);
  const healthTone = goalHealthTone(goal.health);

  return (
    <div className={`py-4 ${goal.status === "archived" ? "opacity-60" : goal.status === "paused" ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}22`, color }}
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-[var(--foreground)]">{goal.title}</span>
              <span className="shrink-0 rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--foreground-muted)]">
                {GOAL_TYPE_LABELS[goal.goalType]}
              </span>
              {goal.status !== "active" && (
                <span className="shrink-0 rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--foreground-muted)]">
                  {STATUS_LABEL[goal.status]}
                </span>
              )}
              {goal.priority !== "medium" && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: `${goalPriorityTone(goal.priority)}1a`, color: goalPriorityTone(goal.priority) }}
                >
                  {GOAL_PRIORITY_LABELS[goal.priority]}
                </span>
              )}
            </div>
            {goal.description && <p className="mt-0.5 truncate text-xs text-[var(--foreground-muted)]">{goal.description}</p>}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--foreground-muted)]">
              {goal.targetDateLabel && <span>Target: {goal.targetDateLabel}</span>}
              {goal.completedDateLabel && <span>Completed: {goal.completedDateLabel}</span>}
              {goal.accountName && <span>Linked to {goal.accountName}</span>}
              {goal.categoryName && <span>Category: {goal.categoryName}</span>}
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {formatCurrency(goal.currentAmount)} <span className="font-normal text-[var(--foreground-muted)]">of {formatCurrency(goal.targetAmount)}</span>
          </p>
          <ProgressBreakdown goal={goal} />
          <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${healthTone}1a`, color: healthTone }}>
            {GOAL_HEALTH_LABELS[goal.health]}
          </span>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${goal.percentCompleteDisplay}%`, backgroundColor: healthTone }}
        />
      </div>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">
        {Math.round(goal.percentCompleteDisplay)}% complete ·{" "}
        {goal.remainingAmount > 0 ? `${formatCurrency(goal.remainingAmount)} remaining` : "Target reached"}
      </p>

      <FundingSourcesList goal={goal} />

      <div className="mt-3">
        <GoalRowControls goal={goal} allocatableAccounts={allocatableAccounts} />
      </div>
    </div>
  );
}

function DisabledDropdown({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Not available yet"
      className="flex cursor-not-allowed items-center gap-1.5 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
    >
      {label}
      <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

export function GoalsOverviewCard({
  hasGoals,
  goals,
  allocatableAccounts,
}: {
  hasGoals: boolean;
  goals?: GoalRow[];
  allocatableAccounts?: AllocatableAccountOption[];
}) {
  if (!hasGoals || !goals) {
    return (
      <Card>
        <CardHeader title="Goals Overview">
          <div className="flex items-center gap-3">
            <DisabledDropdown label="All Goals" />
            <DisabledDropdown label="Sort: Progress" />
          </div>
        </CardHeader>

        <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-12 text-center">
          <Target className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No goals created yet</p>
          <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
            Create a goal to start tracking progress toward what matters to you.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Goals Overview">
        <div className="flex items-center gap-3">
          {/* Filtering/sorting isn't wired to a real control yet — the
              list below is already ordered by display order, and there
              are few enough goals in V1 that a picker isn't load-bearing.
              Shown disabled so the page's action hierarchy matches the
              approved mockup, same convention as Budgets. */}
          <DisabledDropdown label="All Goals" />
          <DisabledDropdown label="Sort: Progress" />
        </div>
      </CardHeader>

      <div className="divide-y divide-[var(--border)]">
        {goals.map((goal) => (
          <GoalListItem key={goal.id} goal={goal} allocatableAccounts={allocatableAccounts ?? []} />
        ))}
      </div>
    </Card>
  );
}
