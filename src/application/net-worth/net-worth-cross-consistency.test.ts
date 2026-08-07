import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { summarizeAccounts } from "@/application/accounts/accounts-summary";
import type { Account, AccountType } from "@/domains/accounts/types";
import type { AccountBalanceSnapshot } from "@/domains/net-worth-history/types";

import { computeHistoricalNetWorthBreakdown, computeNetWorthBreakdown } from "./net-worth-breakdown";

// Regression coverage for the canonicalization refactor: current Net
// Worth (computeNetWorthBreakdown), the Accounts workspace's own summary
// (summarizeAccounts), and historical Net Worth reconstruction
// (computeHistoricalNetWorthBreakdown) must never be able to silently
// disagree on the same underlying balances — they all route through the
// same account-type classification (getAccountPresentation) and the same
// liability-sign handling (magnitude for liabilities, signed for assets).
// If any of these three ever forked into an independent calculation
// again, at least one test below would catch it.

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

function makeSnapshot(account: Account, snapshotDate = "2026-01-31"): AccountBalanceSnapshot {
  return {
    id: randomUUID(),
    ownerId: account.ownerId,
    accountId: account.id,
    snapshotDate,
    balance: account.currentBalance ?? "0.0000",
    accountType: account.accountType,
    balanceSource: account.balanceSource,
    snapshotType: "monthly",
    createdAt: new Date(),
  };
}

const MIXED_PORTFOLIO: Account[] = [
  makeAccount("checking", "4200.00"),
  makeAccount("savings", "18400.00"),
  makeAccount("investment", "42000.00"),
  makeAccount("credit-card", "-1284.55"),
  makeAccount("mortgage", "-318450.00"),
  makeAccount("vehicle-loan", "-14670.32"),
];

describe("current Net Worth and current account summary agree", () => {
  it("computeNetWorthBreakdown's totalAssets/totalLiabilities/netWorth equal summarizeAccounts' youHave/youOwe/difference", () => {
    const breakdown = computeNetWorthBreakdown(MIXED_PORTFOLIO);
    const summary = summarizeAccounts(MIXED_PORTFOLIO);

    expect(breakdown.totalAssets).toBe(summary.youHave);
    expect(breakdown.totalLiabilities).toBe(summary.youOwe);
    expect(breakdown.netWorth).toBe(summary.difference);
  });

  it("agree for a liabilities-only portfolio", () => {
    const accounts = [makeAccount("credit-card", "-500.00"), makeAccount("personal-loan", "-2000.00")];

    const breakdown = computeNetWorthBreakdown(accounts);
    const summary = summarizeAccounts(accounts);

    expect(breakdown.totalAssets).toBe(summary.youHave);
    expect(breakdown.totalLiabilities).toBe(summary.youOwe);
    expect(breakdown.netWorth).toBe(summary.difference);
  });

  it("agree for an empty portfolio", () => {
    const breakdown = computeNetWorthBreakdown([]);
    const summary = summarizeAccounts([]);

    expect(breakdown.totalAssets).toBe(summary.youHave);
    expect(breakdown.totalLiabilities).toBe(summary.youOwe);
    expect(breakdown.netWorth).toBe(summary.difference);
  });
});

describe("historical Net Worth reconstruction follows the same sign convention as current Net Worth", () => {
  it("computeHistoricalNetWorthBreakdown equals computeNetWorthBreakdown for the same balances", () => {
    const snapshots = MIXED_PORTFOLIO.map((account) => makeSnapshot(account));

    const current = computeNetWorthBreakdown(MIXED_PORTFOLIO);
    const historical = computeHistoricalNetWorthBreakdown(snapshots);

    expect(historical.totalAssets).toBe(current.totalAssets);
    expect(historical.totalLiabilities).toBe(current.totalLiabilities);
    expect(historical.netWorth).toBe(current.netWorth);
  });

  it("a liability's negative balance is reconstructed as a positive totalLiabilities magnitude historically too — signs cannot drift between paths", () => {
    const mortgage = makeAccount("mortgage", "-250000.00");
    const snapshot = makeSnapshot(mortgage);

    const current = computeNetWorthBreakdown([mortgage]);
    const historical = computeHistoricalNetWorthBreakdown([snapshot]);

    expect(current.totalLiabilities).toBe(250000);
    expect(historical.totalLiabilities).toBe(250000);
    expect(current.netWorth).toBe(-250000);
    expect(historical.netWorth).toBe(-250000);
  });

  it("an asset's balance is reconstructed as a signed contribution historically too, not a magnitude", () => {
    const checking = makeAccount("checking", "3200.00");
    const snapshot = makeSnapshot(checking);

    const current = computeNetWorthBreakdown([checking]);
    const historical = computeHistoricalNetWorthBreakdown([snapshot]);

    expect(current.totalAssets).toBe(3200);
    expect(historical.totalAssets).toBe(3200);
  });

  it("category breakdowns (per account type) also agree between current and historical reconstruction", () => {
    const snapshots = MIXED_PORTFOLIO.map((account) => makeSnapshot(account));

    const current = computeNetWorthBreakdown(MIXED_PORTFOLIO);
    const historical = computeHistoricalNetWorthBreakdown(snapshots);

    expect(historical.assetsByCategory).toEqual(current.assetsByCategory);
    expect(historical.liabilitiesByCategory).toEqual(current.liabilitiesByCategory);
  });

  it("agree for a zero-account state", () => {
    const current = computeNetWorthBreakdown([]);
    const historical = computeHistoricalNetWorthBreakdown([]);

    expect(historical).toEqual(current);
  });
});
