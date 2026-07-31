import { describe, expect, it } from "vitest";

import type { Account } from "@/domains/accounts/types";
import type { Transaction } from "@/domains/transactions/types";

import { toDashboardSnapshot } from "./dashboard-data-adapter";
import type { DashboardRawData } from "./dashboard-service";

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "account-1",
    ownerId: "owner-1",
    institutionId: null,
    name: "Checking",
    accountType: "checking",
    maskedAccountNumber: null,
    currency: "USD",
    status: "active",
    balanceSource: "manual",
    currentBalance: "100.0000",
    openingDate: null,
    closingDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    ownerId: "owner-1",
    accountId: "account-1",
    categoryId: null,
    transactionDate: "2026-07-05",
    postingDate: null,
    originalDescription: "GROCERY STORE",
    merchant: null,
    amount: "-42.5000",
    transactionType: "expense",
    isExcluded: false,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeRawData(overrides: Partial<DashboardRawData> = {}): DashboardRawData {
  return {
    accounts: [],
    recentTransactions: [],
    categoryTotals: [],
    cashFlowByDate: [],
    netWorth: 0,
    investmentsTotal: 0,
    monthlyCashFlow: 0,
    periodLabel: "2026-06-30 – 2026-07-30",
    ...overrides,
  };
}

describe("toDashboardSnapshot", () => {
  it("preserves the canonical account type and adds presentation fields", () => {
    const raw = makeRawData({
      accounts: [
        { account: makeAccount({ accountType: "mortgage", currentBalance: "-250000.0000" }), institutionName: "First National" },
      ],
    });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.accounts).toEqual([
      {
        id: "account-1",
        name: "Checking",
        institution: "First National",
        accountType: "mortgage",
        displayGroup: "Loans",
        displayLabel: "Mortgage",
        balance: -250000,
      },
    ]);
  });

  it("falls back to the original description when no merchant is set", () => {
    const raw = makeRawData({
      recentTransactions: [{ transaction: makeTransaction({ merchant: null }), categoryName: null }],
    });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.recentActivity[0].merchant).toBe("GROCERY STORE");
  });

  it("prefers the merchant name over the original description when both are present", () => {
    const raw = makeRawData({
      recentTransactions: [
        { transaction: makeTransaction({ merchant: "Greenfield Market" }), categoryName: "Groceries" },
      ],
    });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.recentActivity[0].merchant).toBe("Greenfield Market");
    expect(snapshot.recentActivity[0].category).toBe("Groceries");
  });

  it("labels an unresolved category as Uncategorized", () => {
    const raw = makeRawData({
      recentTransactions: [{ transaction: makeTransaction(), categoryName: null }],
    });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.recentActivity[0].category).toBe("Uncategorized");
  });

  it("converts NUMERIC-string transaction amounts to numbers", () => {
    const raw = makeRawData({
      recentTransactions: [{ transaction: makeTransaction({ amount: "-42.5000" }), categoryName: null }],
    });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.recentActivity[0].amount).toBe(-42.5);
  });

  it("computes percent shares and assigns cyclical chart colors for spending by category", () => {
    const raw = makeRawData({
      categoryTotals: [
        { categoryName: "Food & Dining", totalAmount: 300 },
        { categoryName: "Transportation", totalAmount: 100 },
      ],
    });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.spendingByCategory).toEqual([
      { category: "Food & Dining", amount: 300, percent: 75, color: "var(--chart-1)" },
      { category: "Transportation", amount: 100, percent: 25, color: "var(--chart-2)" },
    ]);
    expect(snapshot.spendingTotal).toBe(400);
  });

  it("returns zero percent shares when there is no spending", () => {
    const raw = makeRawData({ categoryTotals: [] });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.spendingByCategory).toEqual([]);
    expect(snapshot.spendingTotal).toBe(0);
  });

  it("passes cash-flow points through with formatted dates", () => {
    const raw = makeRawData({
      cashFlowByDate: [{ date: "2026-07-05", income: 500, expenses: 200 }],
    });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.cashFlowSeries).toEqual([{ date: "Jul 5", income: 500, expenses: 200 }]);
  });

  it("wraps net worth, monthly cash flow, and investments into stat snapshots without fabricated deltas", () => {
    const raw = makeRawData({ netWorth: 1000, monthlyCashFlow: 250, investmentsTotal: 5000 });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.netWorth).toEqual({ label: "Net Worth", value: 1000, caption: raw.periodLabel });
    expect(snapshot.monthlyCashFlow).toEqual({ label: "Monthly Cash Flow", value: 250, caption: raw.periodLabel });
    expect(snapshot.investments).toEqual({ label: "Investments", value: 5000, caption: raw.periodLabel });
  });
});
