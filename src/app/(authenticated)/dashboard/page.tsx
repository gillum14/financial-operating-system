import { Banknote, PieChart, Target, TrendingUp } from "lucide-react";

import StatCard, { StatDelta } from "@/components/ui/stat-card";
import ProgressBar from "@/components/ui/progress-bar";
import { currentUser } from "@/lib/session";
import {
  accounts,
  budgetProgress,
  cashFlowPeriod,
  cashFlowSeries,
  confidenceScore,
  confidenceTrends,
  dailyInsight,
  encouragementStatement,
  lastUpdatedLabel,
  missionProgress,
  missionStatus,
  operationalHighlights,
  priorityAction,
  recentActivity,
  spendingByCategory,
  spendingTotal,
  spendingUpdatedLabel,
  statSummaries,
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

const [netWorth, monthlyCashFlow, investments] = statSummaries;

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const greeting = getGreeting(new Date().getHours());
  const firstName = currentUser.name.split(" ")[0];

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
        <StatCard label="Net Worth" value={netWorth.value} icon={TrendingUp}>
          <StatDelta
            deltaLabel={netWorth.deltaLabel}
            positive={netWorth.deltaPositive}
            caption={netWorth.caption}
          />
        </StatCard>

        <StatCard label="Monthly Cash Flow" value={monthlyCashFlow.value} icon={Banknote}>
          <StatDelta
            deltaLabel={monthlyCashFlow.deltaLabel}
            positive={monthlyCashFlow.deltaPositive}
            caption={monthlyCashFlow.caption}
          />
        </StatCard>

        <StatCard label="Budget Status" value={`${budgetProgress.percent}%`} icon={PieChart}>
          <ProgressBar percent={budgetProgress.percent} />
          <p className="mt-2 text-sm text-[var(--success)]">
            ${budgetProgress.remaining.toLocaleString()} under budget
          </p>
        </StatCard>

        <StatCard label="Investments" value={investments.value} icon={Target}>
          <StatDelta
            deltaLabel={investments.deltaLabel}
            positive={investments.deltaPositive}
            caption={investments.caption}
          />
        </StatCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <FinancialOverviewCard series={cashFlowSeries} period={cashFlowPeriod} />

          <div className="grid gap-6 md:grid-cols-2">
            <BudgetProgressCard progress={budgetProgress} />

            <SpendingByCategoryCard
              categories={spendingByCategory}
              total={spendingTotal}
              periodLabel={cashFlowPeriod.label}
              updatedLabel={spendingUpdatedLabel}
            />
          </div>

          <MissionStatus items={missionStatus} />
        </div>

        <div className="space-y-6">
          <UpcomingObjectives objectives={upcomingObjectives} />
          <AccountsOverview accounts={accounts} />
          <RecentActivity activity={recentActivity} />
        </div>
      </section>

      <DashboardFooter lastUpdatedLabel={lastUpdatedLabel} />
    </div>
  );
}
