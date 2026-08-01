import type { ActivityItem, CashFlowPoint, CategorySpend } from "@/features/dashboard/types";

import { getAccountPresentation } from "./account-presentation";
import type { DashboardRawData } from "./dashboard-service";
import type { DashboardAccountView, DashboardSnapshot, DashboardStatSnapshot } from "./types";

const CATEGORY_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

// transaction_date / cash-flow bucket dates are stored as "YYYY-MM-DD" —
// parsed with an explicit local-midnight time so formatting can't shift the
// day across a UTC/local boundary.
function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatActivityDate(value: string): string {
  return parseDateOnly(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCashFlowDate(value: string): string {
  return parseDateOnly(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// raw.periodLabel is built in DashboardService as "YYYY-MM-DD – YYYY-MM-DD"
// (see dashboard-service.ts's formatDate) — fine as a machine-readable
// value, but it renders to users verbatim wherever it's used as a caption,
// inconsistent with every other date on the dashboard. Reformats for
// display only; the underlying date range is untouched.
function formatPeriodLabel(periodLabel: string): string {
  const [fromRaw, toRaw] = periodLabel.split(" – ");
  const from = parseDateOnly(fromRaw);
  const to = parseDateOnly(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return periodLabel;

  const sameYear = from.getFullYear() === to.getFullYear();
  const fromLabel = from.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const toLabel = to.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return sameYear
    ? `${fromLabel} – ${toLabel}`
    : `${from.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${toLabel}`;
}

// Category rank (sort-by-amount position) can change from one load to the
// next as spending shifts, so assigning color by array index would repaint
// a category a different color across renders. Hashing the category name
// keeps each category's color stable regardless of its current rank.
function colorForCategory(categoryName: string): string {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = (hash * 31 + categoryName.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_CHART_COLORS[hash % CATEGORY_CHART_COLORS.length];
}

function toAccountViews(accounts: DashboardRawData["accounts"]): DashboardAccountView[] {
  return accounts.map(({ account, institutionName }) => {
    const presentation = getAccountPresentation(account.accountType);
    return {
      id: account.id,
      name: account.name,
      institution: institutionName,
      accountType: account.accountType,
      displayGroup: presentation.group,
      displayLabel: presentation.label,
      balance: account.currentBalance ? Number(account.currentBalance) : 0,
    };
  });
}

function toRecentActivity(recentTransactions: DashboardRawData["recentTransactions"]): ActivityItem[] {
  return recentTransactions.map(({ transaction, categoryName }) => ({
    id: transaction.id,
    merchant: transaction.merchant ?? transaction.originalDescription,
    date: formatActivityDate(transaction.transactionDate),
    amount: Number(transaction.amount),
    category: categoryName ?? "Uncategorized",
  }));
}

function toSpendingByCategory(categoryTotals: DashboardRawData["categoryTotals"]): CategorySpend[] {
  const spendingTotal = categoryTotals.reduce((sum, entry) => sum + entry.totalAmount, 0);

  return categoryTotals.map((entry) => ({
    category: entry.categoryName,
    amount: entry.totalAmount,
    percent: spendingTotal > 0 ? Math.round((entry.totalAmount / spendingTotal) * 100) : 0,
    color: colorForCategory(entry.categoryName),
  }));
}

function toCashFlowSeries(cashFlowByDate: DashboardRawData["cashFlowByDate"]): CashFlowPoint[] {
  return cashFlowByDate.map((point) => ({
    date: formatCashFlowDate(point.date),
    income: point.income,
    expenses: point.expenses,
  }));
}

function toStatSnapshot(label: string, value: number, caption: string): DashboardStatSnapshot {
  return { label, value, caption };
}

export function toDashboardSnapshot(raw: DashboardRawData): DashboardSnapshot {
  const spendingByCategory = toSpendingByCategory(raw.categoryTotals);
  const spendingTotal = spendingByCategory.reduce((sum, entry) => sum + entry.amount, 0);
  const periodLabel = formatPeriodLabel(raw.periodLabel);

  return {
    accounts: toAccountViews(raw.accounts),
    recentActivity: toRecentActivity(raw.recentTransactions),
    spendingByCategory,
    spendingTotal,
    cashFlowSeries: toCashFlowSeries(raw.cashFlowByDate),
    netWorth: toStatSnapshot("Net Worth", raw.netWorth, periodLabel),
    monthlyCashFlow: toStatSnapshot("Monthly Cash Flow", raw.monthlyCashFlow, periodLabel),
    investments: toStatSnapshot("Investments", raw.investmentsTotal, periodLabel),
  };
}
