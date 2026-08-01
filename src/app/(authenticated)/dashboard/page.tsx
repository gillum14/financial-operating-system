import { Banknote, PieChart, Target, TrendingUp } from "lucide-react";

import StatCard, { StatCaption } from "@/components/ui/stat-card";
import ProgressBar from "@/components/ui/progress-bar";
import { currentUser } from "@/lib/session";
import { getDashboardSnapshot } from "@/composition/dashboard-query";
import { resolveDevelopmentOwnerId } from "@/composition/development-owner";
import {
  budgetProgress,
  confidenceScore,
  confidenceTrends,
  dailyInsight,
  encouragementStatement,
  missionProgress,
  missionStatus,
  operationalHighlights,
  priorityAction,
  upcomingObjectives,
} from "@/features/dashboard/mock-data";
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
// time (see resolveDevelopmentOwnerId / getDashboardSnapshot below) — it
// must never be statically prerendered or cached across owners.
export const dynamic = "force-dynamic";

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  const greeting = getGreeting(new Date().getHours());
  const firstName = currentUser.name.split(" ")[0];

  // Sections still sourced from mock data (Confidence Engine, Mission
  // Engine, budget domain, and objectives/recommendations aren't
  // implemented yet — out of scope for this slice) are wired below
  // unchanged; everything else comes from a real DashboardSnapshot.
  const ownerId = resolveDevelopmentOwnerId();
  // Recent Activity is a compact widget, not the full ledger — "View all"
  // is the entry point to the complete history. Uses DashboardService's
  // existing recentActivityLimit option rather than slicing anywhere else,
  // so callers who need the full recent-transaction set (there are none
  // today) still get it by passing a larger limit or omitting it.
  const snapshot = await getDashboardSnapshot(ownerId, { recentActivityLimit: 5 });

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
    <div className="space-y-6">
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

          <MissionProgress missions={missionProgress} />
        </div>

        <div className="lg:max-w-xs lg:flex-1 lg:self-center">
          <FinancialBriefSummary highlights={operationalHighlights} priorityAction={priorityAction} />
        </div>

        <ConfidenceScoreCard score={confidenceScore} trends={confidenceTrends} className="lg:w-64 shrink-0" />
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net Worth" value={currencyFormatter.format(snapshot.netWorth.value)} icon={TrendingUp}>
          <StatCaption caption={asOfLabel} />
        </StatCard>

        <StatCard
          label="Monthly Cash Flow"
          value={currencyFormatter.format(snapshot.monthlyCashFlow.value)}
          icon={Banknote}
        >
          <StatCaption caption={asOfLabel} />
        </StatCard>

        <StatCard label="Budget Status" value={`${budgetProgress.percent}%`} icon={PieChart}>
          <ProgressBar percent={budgetProgress.percent} />
          <p className="mt-2 text-sm text-[var(--success)]">
            ${budgetProgress.remaining.toLocaleString()} under budget
          </p>
        </StatCard>

        <StatCard label="Investments" value={currencyFormatter.format(snapshot.investments.value)} icon={Target}>
          <StatCaption caption={asOfLabel} />
        </StatCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <FinancialOverviewCard series={snapshot.cashFlowSeries} period={cashFlowPeriod} />

          <div className="grid gap-6 md:grid-cols-2">
            <BudgetProgressCard progress={budgetProgress} />

            <SpendingByCategoryCard
              categories={snapshot.spendingByCategory}
              total={snapshot.spendingTotal}
              periodLabel={cashFlowPeriod.label}
              updatedLabel={asOfLabel}
            />
          </div>

          <MissionStatus items={missionStatus} />
        </div>

        <div className="space-y-6">
          <UpcomingObjectives objectives={upcomingObjectives} />
          <AccountsOverview accounts={snapshot.accounts} />
          <RecentActivity activity={snapshot.recentActivity} />
        </div>
      </section>

      <DashboardFooter lastUpdatedLabel={asOfLabel} />
    </div>
  );
}
