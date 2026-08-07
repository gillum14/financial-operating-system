import { ChevronDown } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import { BudgetProgressRing } from "@/components/charts/budget-progress-ring";
import type { BudgetProgress } from "@/features/dashboard/types";

export function BudgetProgressCard({ progress }: { progress: BudgetProgress }) {
  return (
    <Card>
      <CardHeader title="Budget Progress">
        <span className="flex items-center gap-1 text-sm text-[var(--foreground-muted)]">
          {progress.periodLabel}
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
      </CardHeader>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          <BudgetProgressRing percent={progress.percent} />
          <p className="mt-4 text-center text-xs text-[var(--foreground-muted)]">
            {progress.daysRemaining} days remaining in {progress.periodLabel.split(" ")[0]}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]">
              ${progress.budgeted.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--foreground-muted)]">Budgeted</p>
          </div>

          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]">
              ${progress.spent.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--foreground-muted)]">Spent</p>
          </div>

          <div>
            <p className={`text-lg font-semibold ${progress.remaining < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              ${Math.abs(progress.remaining).toLocaleString()}
              {progress.remaining < 0 ? " over" : ""}
            </p>
            <p className="text-xs text-[var(--foreground-muted)]">Remaining</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
