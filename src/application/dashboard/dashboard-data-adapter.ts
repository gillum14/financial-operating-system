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

  return categoryTotals.map((entry, index) => ({
    category: entry.categoryName,
    amount: entry.totalAmount,
    percent: spendingTotal > 0 ? (entry.totalAmount / spendingTotal) * 100 : 0,
    color: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
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

  return {
    accounts: toAccountViews(raw.accounts),
    recentActivity: toRecentActivity(raw.recentTransactions),
    spendingByCategory,
    spendingTotal,
    cashFlowSeries: toCashFlowSeries(raw.cashFlowByDate),
    netWorth: toStatSnapshot("Net Worth", raw.netWorth, raw.periodLabel),
    monthlyCashFlow: toStatSnapshot("Monthly Cash Flow", raw.monthlyCashFlow, raw.periodLabel),
    investments: toStatSnapshot("Investments", raw.investmentsTotal, raw.periodLabel),
  };
}
