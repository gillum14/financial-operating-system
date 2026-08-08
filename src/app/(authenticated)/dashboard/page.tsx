import { Banknote, PieChart, Target, TrendingUp } from "lucide-react";

import StatCard, { StatCaption, StatDelta } from "@/components/ui/stat-card";
import ProgressBar from "@/components/ui/progress-bar";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";
import { getBudgetsOverview } from "@/composition/budgets-query";
import { getConfidenceOverview } from "@/composition/confidence-query";
import { getDashboardSnapshot } from "@/composition/dashboard-query";
import { getGoalsOverview } from "@/composition/goals-query";
import { getMissionsOverview } from "@/composition/missions-query";
import { getNetWorthOverview } from "@/composition/net-worth-query";
import { getUserProfile } from "@/composition/user-profile";
import { formatStatDelta } from "@/features/net-worth/format";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import type { BudgetProgress, MissionProgressItem } from "@/features/dashboard/types";
import { dailyInsight, encouragementStatement, operationalHighlights, priorityAction } from "@/features/dashboard/mock-data";
import { ConfidenceScoreCard } from "@/features/dashboard/components/confidence-score-card";
import { FinancialBriefSummary } from "@/features/dashboard/components/financial-brief-summary";
import { MissionProgress } from "@/features/dashboard/components/mission-progress";
import { FinancialOverviewCard } from "@/features/dashboard/components/financial-overview-card";
import { BudgetProgressCard } from "@/features/dashboard/components/budget-progress-card";
import { SpendingByCategoryCard } from "@/features/dashboard/components/spending-by-category-card";
import { MissionStatus } from "@/features/dashboard/components/mission-status";
import { UpcomingObjectives } from "@/features/dashboard/components/upcoming-objectives";
import { AccountsOverview } from "@/features/dashboard/components/accounts-overview";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";
import { DashboardFooter } from "@/features/dashboard/components/dashboard-footer";

// This page renders live, per-owner financial data resolved at request
// time (see requireAuthenticatedUser / getDashboardSnapshot below) — it
// must never be statically prerendered or cached across owners.
export const dynamic = "force-dynamic";

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function daysRemainingInPeriod(periodEnd: string): number {
  const end = new Date(`${periodEnd}T00:00:00Z`);
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  const greeting = getGreeting(new Date().getHours());

  // Authoritative identity for this request — the (authenticated) layout
  // already redirects unauthenticated requests, but ownerId still comes
  // from here directly rather than any prop, since it must never be
  // trusted from anything client-controlled.
  const authUser = await requireAuthenticatedUser();
  const profile = await getUserProfile(authUser.id);
  const firstName = (profile?.displayName ?? authUser.email).split(" ")[0];

  // Everything on this page is real, composition-layer data — Confidence
  // Engine (getConfidenceOverview) and Mission Engine (getMissionsOverview)
  // included. The only remaining mock-data.ts imports left below
  // (encouragementStatement/dailyInsight/operationalHighlights/
  // priorityAction) are presentational copy with no backing calculation
  // domain yet, not fabricated numbers.
  //
  // Recent Activity is a compact widget, not the full ledger — "View all"
  // is the entry point to the complete history. Uses DashboardService's
  // existing recentActivityLimit option rather than slicing anywhere else,
  // so callers who need the full recent-transaction set (there are none
  // today) still get it by passing a larger limit or omitting it.
  const snapshot = await getDashboardSnapshot(authUser.id, { recentActivityLimit: 5 });

  // Same composition function the Budgets page itself calls
  // (getBudgetsOverview) — this is the one and only place budget totals
  // are computed; the Dashboard never re-derives them from Transactions
  // independently, so the two pages can never silently disagree.
  const budgetOverview = await getBudgetsOverview(authUser.id);

  // Same composition function the Goals page itself calls
  // (getGoalsOverview) — the "Progress" widget below shows real,
  // GoalService-derived percentages, never a second calculation of the
  // same numbers. Only in-progress (active) goals are shown here —
  // completed/archived goals aren't "something to make progress on"
  // anymore — capped to the first 4 by display order, the same shape the
  // former mock data had (2 example goals) but real and unbounded by a
  // hardcoded list.
  const goalsOverview = await getGoalsOverview(authUser.id);

  // Same composition function the Net Worth page itself calls
  // (getNetWorthOverview) — the Net Worth tile's delta below is the exact
  // same netWorthChange that page's summary metrics render, never a
  // second delta calculation. hasHistory gates it: with no historical
  // snapshot yet, the tile falls back to the same honest "as of" caption
  // it always had, never a fabricated 0% or invented comparison.
  const netWorthOverview = await getNetWorthOverview(authUser.id);

  // The one canonical Confidence calculation path (see composition/
  // confidence-query.ts) — reuses Budgets/Goals/Net Worth's own real
  // output rather than a second computation of any of that math.
  const confidenceOverview = await getConfidenceOverview(authUser.id);

  // The one canonical Mission calculation path (see composition/
  // missions-query.ts) — Mission Status below renders these real active
  // missions directly, never a second progress calculation.
  const missionsOverview = await getMissionsOverview(authUser.id);
  const missionProgress: MissionProgressItem[] = (goalsOverview.goals ?? [])
    .filter((goal) => goal.status === "active")
    .slice(0, 4)
    .map((goal) => ({ id: goal.id, label: goal.title, percent: Math.round(goal.percentCompleteDisplay) }));
  const budgetProgress: BudgetProgress | null =
    budgetOverview.hasBudget && budgetOverview.period && budgetOverview.metrics
      ? {
          percent: Math.round(budgetOverview.metrics.overallProgress),
          budgeted: budgetOverview.metrics.totalBudgeted,
          spent: budgetOverview.metrics.totalSpent,
          remaining: budgetOverview.metrics.totalRemaining,
          daysRemaining: daysRemainingInPeriod(budgetOverview.period.periodEnd),
          periodLabel: budgetOverview.period.label,
        }
      : null;

  const asOfLabel = `As of ${new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;

  const cashFlowIncome = snapshot.cashFlowSeries.reduce((sum, point) => sum + point.income, 0);
  const cashFlowExpenses = snapshot.cashFlowSeries.reduce((sum, point) => sum + point.expenses, 0);
  const cashFlowPeriod = {
    label: snapshot.netWorth.caption,
    income: cashFlowIncome,
    expenses: cashFlowExpenses,
    netCashFlow: cashFlowIncome - cashFlowExpenses,
  };

  return (
    // overflow-x-hidden + min-w-0: same containment boundary established
    // on Transactions/Budgets/Goals — a wide descendant (e.g. a chart or
    // stat grid) must never be able to inflate document.body.scrollWidth
    // past the viewport on narrow screens. The Dashboard page predates
    // that convention; applied here while verifying the new Goals-driven
    // Progress widget's mobile rendering.
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-md">
          <p className="text-sm font-medium tracking-[0.16em] text-[var(--primary)] uppercase">Dashboard</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Financial Brief
          </h1>

          <p className="mt-4 text-xl font-semibold text-[var(--foreground)]">
            {greeting}, {firstName}.
          </p>

          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">{encouragementStatement}</p>

          <p className="mt-3 flex items-start gap-2 text-sm text-[var(--foreground-secondary)]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]" />
            <span>{dailyInsight}</span>
          </p>

          {missionProgress.length > 0 && <MissionProgress missions={missionProgress} />}
        </div>

        <div className="lg:max-w-xs lg:flex-1 lg:self-center">
          <FinancialBriefSummary highlights={operationalHighlights} priorityAction={priorityAction} />
        </div>

        <ConfidenceScoreCard overview={confidenceOverview} className="lg:w-64 shrink-0" />
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Value comes from netWorthOverview (the same getNetWorthOverview
            call the Net Worth page itself renders), not snapshot.netWorth
            — DashboardService's own netWorth is now computed via the same
            canonical computeNetWorthBreakdown and will always agree, but
            rendering from one single fetched value here removes any
            dependency on two independent calls staying in sync. */}
        <StatCard label="Net Worth" value={currencyFormatter.format(netWorthOverview.netWorth)} icon={TrendingUp}>
          {netWorthOverview.netWorthChange ? (
            <StatDelta {...formatStatDelta(netWorthOverview.netWorthChange)} />
          ) : (
            <StatCaption caption={asOfLabel} />
          )}
        </StatCard>

        <StatCard
          label="Monthly Cash Flow"
          value={currencyFormatter.format(snapshot.monthlyCashFlow.value)}
          icon={Banknote}
        >
          <StatCaption caption={asOfLabel} />
        </StatCard>

        {budgetProgress ? (
          <StatCard label="Budget Status" value={`${budgetProgress.percent}%`} icon={PieChart}>
            <ProgressBar percent={budgetProgress.percent} />
            <p className={`mt-2 text-sm ${budgetProgress.remaining < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              ${Math.abs(budgetProgress.remaining).toLocaleString()} {budgetProgress.remaining < 0 ? "over budget" : "under budget"}
            </p>
          </StatCard>
        ) : (
          <StatCard label="Budget Status" value="—" icon={PieChart}>
            <StatCaption caption="No active budget" />
          </StatCard>
        )}

        <StatCard label="Investments" value={currencyFormatter.format(snapshot.investments.value)} icon={Target}>
          <StatCaption caption={asOfLabel} />
        </StatCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <FinancialOverviewCard series={snapshot.cashFlowSeries} period={cashFlowPeriod} />

          <div className="grid gap-6 md:grid-cols-2">
            {budgetProgress ? (
              <BudgetProgressCard progress={budgetProgress} />
            ) : (
              <Card>
                <CardHeader title="Budget Progress" />
                <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-12 text-center">
                  <PieChart className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">No active budget</p>
                  <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
                    Create a budget to see planned vs. actual spending here.
                  </p>
                </div>
              </Card>
            )}

            <SpendingByCategoryCard
              categories={snapshot.spendingByCategory}
              total={snapshot.spendingTotal}
              periodLabel={cashFlowPeriod.label}
              updatedLabel={asOfLabel}
            />
          </div>

          <MissionStatus missions={missionsOverview.active} />
        </div>

        <div className="space-y-6">
          <UpcomingObjectives objectives={goalsOverview.upcomingObjectives ?? []} />
          <AccountsOverview accounts={snapshot.accounts} />
          <RecentActivity activity={snapshot.recentActivity} />
        </div>
      </section>

      <DashboardFooter lastUpdatedLabel={asOfLabel} />
    </div>
  );
}
