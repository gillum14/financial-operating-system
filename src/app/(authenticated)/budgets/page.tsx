import { getBudgetsOverview } from "@/composition/budgets-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import { BudgetByCategoryCard } from "@/features/budgets/components/budget-by-category-card";
import { BudgetOverviewMetrics } from "@/features/budgets/components/budget-overview-metrics";
import { BudgetPeriodCard } from "@/features/budgets/components/budget-period-card";
import { BudgetSummaryCard } from "@/features/budgets/components/budget-summary-card";
import { BudgetsHeader } from "@/features/budgets/components/budgets-header";
import { BudgetsTabs } from "@/features/budgets/components/budgets-tabs";
import { OnTrackCard } from "@/features/budgets/components/on-track-card";
import { RecentAdjustmentsCard } from "@/features/budgets/components/recent-adjustments-card";
import { BUDGETS_GRID_COLS } from "@/features/budgets/layout";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as Dashboard/Accounts/
// Transactions).
export const dynamic = "force-dynamic";

// The rail's 4 cards, rendered once per breakpoint mode (desktop `aside`,
// stacked-below-threshold block) below — kept as one function so the two
// render sites can't drift out of sync with each other. Same pattern as
// Transactions' RailCards. Budget Period is first, so it lands directly
// beneath Overall Progress (the last full-width metric tile) in the
// approved layout.
function RailCards() {
  return (
    <>
      <BudgetPeriodCard />
      <BudgetSummaryCard />
      <OnTrackCard />
      <RecentAdjustmentsCard />
    </>
  );
}

export default async function BudgetsPage() {
  const authUser = await requireAuthenticatedUser();
  const overview = await getBudgetsOverview(authUser.id);

  return (
    // overflow-x-hidden + min-w-0: same containment boundary established
    // on the Transactions page — a wide descendant must never be able to
    // inflate document.body.scrollWidth past the viewport on narrow
    // screens.
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <BudgetsHeader />

      {/* Tabs and the 4 overview metrics are full-width, NOT inside the
          two-column grid below — the approved layout only splits into a
          workspace/rail pair starting at Budget by Category. Putting the
          tab strip inside the (narrower) grid column previously left its
          divider stopping short of the rail's width instead of spanning
          the full content area. */}
      <BudgetsTabs>
        <div className="space-y-6">
          <BudgetOverviewMetrics hasBudget={overview.hasBudget} />

          {/* Two-column shape starts here: main workspace + a narrow
              utility rail as a true grid sibling, not a stack that only
              happens to collapse. Held off until the same custom 1360px
              threshold Transactions uses, for one consistent responsive
              behavior across both pages. */}
          <div className={`${BUDGETS_GRID_COLS} items-start`}>
            <div className="min-w-0">
              <BudgetByCategoryCard hasBudget={overview.hasBudget} />
            </div>

            {/* True grid sibling of the workspace column above, visible
                only at the desktop threshold — this is what makes the
                rail sit beside the workspace rather than below it. */}
            <aside className="hidden space-y-4 min-[1360px]:block">
              <RailCards />
            </aside>
          </div>

          {/* Below the threshold the grid above collapses to one column
              and <aside> is hidden — this is the stacked-below rendering
              of the same 4 cards, shown only at those narrower widths. */}
          <div className="space-y-4 min-[1360px]:hidden">
            <RailCards />
          </div>
        </div>
      </BudgetsTabs>

      <p className="text-center text-xs text-[var(--foreground-muted)]">Budgets are personal guidelines. You&apos;re in control.</p>
    </div>
  );
}
