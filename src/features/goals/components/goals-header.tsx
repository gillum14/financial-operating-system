import type { LinkableAccountOption, LinkableCategoryOption } from "@/application/goals/goals-views";

import { CreateGoalButton } from "./create-goal-button";

export function GoalsHeader({
  linkableAccounts,
  linkableCategories,
}: {
  linkableAccounts: LinkableAccountOption[];
  linkableCategories: LinkableCategoryOption[];
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Goals</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">Build the future you want, one goal at a time.</p>
      </div>

      <CreateGoalButton linkableAccounts={linkableAccounts} linkableCategories={linkableCategories} />
    </div>
  );
}
