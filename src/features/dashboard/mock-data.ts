import type { Account, ActivityItem, CashFlowPoint, CategorySpend, StatSummary } from "./types";

export const briefDate = {
  label: "May 29, 2026",
  weekday: "Friday",
};

export const statSummaries: StatSummary[] = [
  {
    label: "Net Worth",
    value: "$412,860",
    deltaLabel: "$8,125 (2.01%)",
    deltaPositive: true,
    caption: "vs last 30 days",
  },
  {
    label: "Monthly Cash Flow",
    value: "$3,240",
    deltaLabel: "$580 (21.9%)",
    deltaPositive: true,
    caption: "vs last 30 days",
  },
  {
    label: "Investments",
    value: "$285,420",
    deltaLabel: "$6,230 (2.23%)",
    deltaPositive: true,
    caption: "vs last 30 days",
  },
];

export const cashFlowSeries: CashFlowPoint[] = [
  { date: "Apr 30", income: 6520, expenses: 4180 },
  { date: "May 3", income: 6780, expenses: 4420 },
  { date: "May 7", income: 6640, expenses: 4960 },
  { date: "May 10", income: 8320, expenses: 5480 },
  { date: "May 14", income: 8710, expenses: 5720 },
  { date: "May 17", income: 7960, expenses: 5540 },
  { date: "May 21", income: 8180, expenses: 5860 },
  { date: "May 24", income: 8460, expenses: 6180 },
  { date: "May 28", income: 8940, expenses: 6520 },
];

export const cashFlowPeriod = {
  label: "May 1 – May 29",
  income: 9860,
  expenses: 6620,
  netCashFlow: 3240,
};

export const accounts: Account[] = [
  {
    id: "checking",
    name: "Checking",
    institution: "Chase Total Checking",
    type: "Checking",
    balance: 4562.18,
  },
  {
    id: "savings",
    name: "Savings",
    institution: "Ally Online Savings",
    type: "Savings",
    balance: 17380.45,
  },
  {
    id: "credit-card",
    name: "Credit Card",
    institution: "Chase Sapphire Reserve",
    type: "Credit card",
    balance: -2184.73,
  },
  {
    id: "investment",
    name: "Investment",
    institution: "Fidelity Brokerage",
    type: "Investment",
    balance: 285420.12,
  },
];

export const spendingByCategory: CategorySpend[] = [
  { category: "Housing", amount: 2348, percent: 35, color: "var(--chart-1)" },
  { category: "Food & Dining", amount: 1245, percent: 19, color: "var(--chart-2)" },
  { category: "Transportation", amount: 865, percent: 13, color: "var(--chart-3)" },
  { category: "Utilities", amount: 456, percent: 7, color: "var(--chart-4)" },
  { category: "Health & Fitness", amount: 387, percent: 6, color: "var(--chart-5)" },
  { category: "Other", amount: 1319, percent: 20, color: "var(--chart-6)" },
];

export const spendingTotal = 6620;
export const spendingUpdatedLabel = "Updated 2 min ago";

export const encouragementStatement = "You're making strong progress toward your financial goals.";

export const dailyInsight = "Investments continue trending upward, up 2.23% this month.";

export const operationalHighlights: string[] = [
  "Cash flow is positive — $3,240 net for May, up 21.9%.",
  "Net worth grew 2.01% ($8,125) over the last 30 days.",
];

export const priorityAction = "Review your accounts and budget for anything that needs attention.";

export const recentActivity: ActivityItem[] = [
  {
    id: "starbucks",
    merchant: "Starbucks",
    date: "May 28, 2026",
    amount: -5.45,
    category: "Food & Dining",
  },
  {
    id: "heb",
    merchant: "H-E-B",
    date: "May 28, 2026",
    amount: -82.14,
    category: "Food & Dining",
  },
  {
    id: "shell",
    merchant: "Shell",
    date: "May 27, 2026",
    amount: -45.0,
    category: "Transportation",
  },
  {
    id: "amazon",
    merchant: "Amazon",
    date: "May 26, 2026",
    amount: -129.99,
    category: "Shopping",
  },
];

export const lastUpdatedLabel = "Last updated: 2 minutes ago";
