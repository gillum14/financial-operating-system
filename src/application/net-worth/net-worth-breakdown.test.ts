import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { Account, AccountType } from "@/domains/accounts/types";

import { computeNetWorthBreakdown } from "./net-worth-breakdown";

function makeAccount(accountType: AccountType, currentBalance: string | null, overrides: Partial<Account> = {}): Account {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: randomUUID(),
    institutionId: null,
    name: "Test Account",
    accountType,
    maskedAccountNumber: null,
    currency: "USD",
    status: "active",
    balanceSource: "manual",
    currentBalance,
    openingDate: null,
    closingDate: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("computeNetWorthBreakdown", () => {
  it("splits assets and liabilities using the same classification as summarizeAccounts", () => {
    const accounts = [
      makeAccount("checking", "5000.00"),
      makeAccount("credit-card", "-1200.00"),
    ];

    const result = computeNetWorthBreakdown(accounts);

    expect(result.totalAssets).toBe(5000);
    expect(result.totalLiabilities).toBe(1200);
    expect(result.netWorth).toBe(3800);
  });

  it("groups by individual account type, not the coarser display group", () => {
    const accounts = [makeAccount("investment", "1000.00"), makeAccount("retirement", "500.00")];

    const result = computeNetWorthBreakdown(accounts);

    // Both share the "Investments" display group, but should stay two
    // separate category rows (Investment, Retirement), not merged.
    expect(result.assetsByCategory).toHaveLength(2);
    expect(result.assetsByCategory.map((item) => item.label).sort()).toEqual(["Investment", "Retirement"]);
  });

  it("sums same-type accounts into one category row", () => {
    const accounts = [makeAccount("savings", "1000.00"), makeAccount("savings", "2000.00")];

    const result = computeNetWorthBreakdown(accounts);

    expect(result.assetsByCategory).toEqual([{ accountType: "savings", label: "Savings", amount: 3000, percent: 100 }]);
  });

  it("computes each category's percent as a share of that side's own total, sorted descending", () => {
    const accounts = [makeAccount("checking", "300.00"), makeAccount("savings", "700.00")];

    const result = computeNetWorthBreakdown(accounts);

    expect(result.assetsByCategory).toEqual([
      { accountType: "savings", label: "Savings", amount: 700, percent: 70 },
      { accountType: "checking", label: "Checking", amount: 300, percent: 30 },
    ]);
  });

  it("treats a null currentBalance as zero", () => {
    const accounts = [makeAccount("checking", null)];

    const result = computeNetWorthBreakdown(accounts);

    expect(result.totalAssets).toBe(0);
    expect(result.assetsByCategory).toEqual([{ accountType: "checking", label: "Checking", amount: 0, percent: 0 }]);
  });

  it("returns zeros and empty category lists for no accounts", () => {
    const result = computeNetWorthBreakdown([]);

    expect(result).toEqual({
      netWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      assetsByCategory: [],
      liabilitiesByCategory: [],
    });
  });
});
