import { Banknote, Gauge, PieChart, Target, TrendingUp } from "lucide-react";

import StatCard, { StatDelta } from "@/components/ui/stat-card";
import ProgressBar from "@/components/ui/progress-bar";
import {
  accounts,
  budgetProgress,
  cashFlowPeriod,
  cashFlowSeries,
  financialReadiness,
  lastUpdatedLabel,
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
import { FinancialBriefSummary } from "@/features/dashboard/components/financial-brief-summary";
import { FinancialOverviewCard } from "@/features/dashboard/components/financial-overview-card";
import { BudgetProgressCard } from "@/features/dashboard/components/budget-progress-card";
import { SpendingByCategoryCard } from "@/features/dashboard/components/spending-by-category-card";
import { MissionStatus } from "@/features/dashboard/components/mission-status";
import { UpcomingObjectives } from "@/features/dashboard/components/upcoming-objectives";
import { AccountsOverview } from "@/features/dashboard/components/accounts-overview";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";
import { DashboardFooter } from "@/features/dashboard/components/dashboard-footer";

const [netWorth, monthlyCashFlow, investments] = statSummaries;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-[0.16em] text-[var(--primary)] uppercase">Dashboard</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Financial Brief
          </h1>

          <p className="mt-2 text-sm text-[var(--foreground-muted)]">
            Here is your operational overview. Focus, execute, achieve mission success.
          </p>

          <div className="mt-5">
            <FinancialBriefSummary highlights={operationalHighlights} priorityAction={priorityAction} />
          </div>
        </div>

        <StatCard
          label="Financial Readiness"
          value={`${financialReadiness.score}/100`}
          icon={Gauge}
          className="lg:w-64 shrink-0"
        >
          <p className="text-sm text-[var(--success)]">{financialReadiness.label}</p>
        </StatCard>
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
