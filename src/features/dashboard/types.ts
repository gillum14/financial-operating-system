export type AccountType = "Checking" | "Savings" | "Credit card" | "Investment";

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: number;
}

export interface ActivityItem {
  id: string;
  merchant: string;
  date: string;
  amount: number;
  category: string;
}

export interface CategorySpend {
  category: string;
  amount: number;
  percent: number;
  color: string;
}

export interface CashFlowPoint {
  date: string;
  income: number;
  expenses: number;
}

export interface StatSummary {
  label: string;
  value: string;
  deltaLabel: string;
  deltaPositive: boolean;
  caption: string;
}

export interface BudgetProgress {
  percent: number;
  budgeted: number;
  spent: number;
  remaining: number;
  daysRemaining: number;
  periodLabel: string;
}

export interface MissionProgressItem {
  id: string;
  label: string;
  percent: number;
}
