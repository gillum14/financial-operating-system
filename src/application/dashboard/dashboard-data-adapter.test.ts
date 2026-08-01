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

  it("computes whole-number percent shares for spending by category", () => {
    const raw = makeRawData({
      categoryTotals: [
        { categoryName: "Food & Dining", totalAmount: 300 },
        { categoryName: "Transportation", totalAmount: 100 },
      ],
    });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.spendingByCategory).toEqual([
      { category: "Food & Dining", amount: 300, percent: 75, color: expect.any(String) },
      { category: "Transportation", amount: 100, percent: 25, color: expect.any(String) },
    ]);
    expect(snapshot.spendingTotal).toBe(400);
  });

  it("rounds percent shares that don't divide evenly to whole numbers", () => {
    const raw = makeRawData({
      categoryTotals: [
        { categoryName: "Food & Dining", totalAmount: 137.53 },
        { categoryName: "Transportation", totalAmount: 95.2 },
        { categoryName: "Utilities", totalAmount: 40 },
      ],
    });

    const snapshot = toDashboardSnapshot(raw);

    for (const entry of snapshot.spendingByCategory) {
      expect(Number.isInteger(entry.percent)).toBe(true);
    }
  });

  it("assigns each category the same color regardless of its sort rank", () => {
    const first = toDashboardSnapshot(
      makeRawData({
        categoryTotals: [
          { categoryName: "Food & Dining", totalAmount: 300 },
          { categoryName: "Transportation", totalAmount: 100 },
        ],
      }),
    );
    // Same two categories, ranking flipped — a rank-based (array-index)
    // color assignment would swap their colors here; a name-based
    // assignment keeps each category's color stable.
    const second = toDashboardSnapshot(
      makeRawData({
        categoryTotals: [
          { categoryName: "Transportation", totalAmount: 300 },
          { categoryName: "Food & Dining", totalAmount: 100 },
        ],
      }),
    );

    const colorFor = (snapshot: typeof first, category: string) =>
      snapshot.spendingByCategory.find((entry) => entry.category === category)?.color;

    expect(colorFor(first, "Food & Dining")).toBe(colorFor(second, "Food & Dining"));
    expect(colorFor(first, "Transportation")).toBe(colorFor(second, "Transportation"));
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

    const expectedCaption = "Jun 30 – Jul 30, 2026";
    expect(snapshot.netWorth).toEqual({ label: "Net Worth", value: 1000, caption: expectedCaption });
    expect(snapshot.monthlyCashFlow).toEqual({ label: "Monthly Cash Flow", value: 250, caption: expectedCaption });
    expect(snapshot.investments).toEqual({ label: "Investments", value: 5000, caption: expectedCaption });
  });

  it("formats a raw ISO period label into a human-readable date range", () => {
    const raw = makeRawData({ periodLabel: "2026-06-30 – 2026-07-30" });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.netWorth.caption).toBe("Jun 30 – Jul 30, 2026");
  });

  it("includes both years in the period label when the range crosses a year boundary", () => {
    const raw = makeRawData({ periodLabel: "2025-12-15 – 2026-01-14" });

    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.netWorth.caption).toBe("Dec 15, 2025 – Jan 14, 2026");
  });
});
