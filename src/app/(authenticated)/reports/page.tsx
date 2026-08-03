import { getReportsOverview } from "@/composition/reports-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import { CashFlowCard } from "@/features/reports/components/cash-flow-card";
import { IncomeVsSpendingCard } from "@/features/reports/components/income-vs-spending-card";
import { InsightPanel } from "@/features/reports/components/insight-panel";
import { MonthlyTrendCard } from "@/features/reports/components/monthly-trend-card";
import { ReportsHeader } from "@/features/reports/components/reports-header";
import { ReportsPeriodSelector } from "@/features/reports/components/reports-period-selector";
import { ReportsSummaryMetrics } from "@/features/reports/components/reports-summary-metrics";
import { ReportsTabs } from "@/features/reports/components/reports-tabs";
import { SpendingBreakdownCard } from "@/features/reports/components/spending-breakdown-card";
import { TopSpendingCategoriesCard } from "@/features/reports/components/top-spending-categories-card";
import { DATE_RANGE_PRESET_LABELS, parseReportsSearchParams, type ReportsSearchParams } from "@/features/reports/search-params";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as Dashboard/Accounts/
// Transactions/Budgets).
export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportsSearchParams>;
}) {
  const authUser = await requireAuthenticatedUser();
  const rawParams = await searchParams;
  const { datePreset, dateFrom, dateTo } = parseReportsSearchParams(rawParams);

  const overview = await getReportsOverview(authUser.id, { dateFrom, dateTo });
  const periodLabel = DATE_RANGE_PRESET_LABELS[datePreset];

  return (
    // overflow-x-hidden + min-w-0: same containment boundary established
    // on Transactions/Budgets — a wide descendant must never be able to
    // inflate document.body.scrollWidth past the viewport on narrow
    // screens. No right rail on this page (per the approved mockup,
    // everything is full-width stacked/paired sections), so there's no
    // two-column grid to keep aligned here.
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <ReportsHeader />

      <ReportsTabs action={<ReportsPeriodSelector />}>
        <div className="space-y-6">
          <ReportsSummaryMetrics summary={overview.summary} savingsRate={overview.savingsRate} periodLabel={periodLabel} />

          <div className="grid gap-6 lg:grid-cols-2">
            <SpendingBreakdownCard categoryBreakdown={overview.categoryBreakdown} totalSpend={overview.summary.expenses} />
            <CashFlowCard />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <IncomeVsSpendingCard summary={overview.summary} />
            <TopSpendingCategoriesCard categoryBreakdown={overview.categoryBreakdown} />
            <MonthlyTrendCard />
          </div>

          <InsightPanel />
        </div>
      </ReportsTabs>
    </div>
  );
}
