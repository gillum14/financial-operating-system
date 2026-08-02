import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { Account } from "@/domains/accounts/types";

import { summarizeAccounts } from "./accounts-summary";

function makeAccount(overrides: Partial<Account>): Account {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: randomUUID(),
    institutionId: null,
    name: "Test Account",
    accountType: "checking",
    maskedAccountNumber: null,
    currency: "USD",
    status: "active",
    balanceSource: "manual",
    currentBalance: "0",
    openingDate: null,
    closingDate: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("summarizeAccounts", () => {
  it("sums asset-group balances into youHave", () => {
    const accounts = [
      makeAccount({ accountType: "checking", currentBalance: "1000.00" }),
      makeAccount({ accountType: "savings", currentBalance: "2500.50" }),
      makeAccount({ accountType: "investment", currentBalance: "10000.00" }),
    ];

    expect(summarizeAccounts(accounts)).toEqual({ youHave: 13500.5, youOwe: 0, difference: 13500.5 });
  });

  it("sums liability-group balances into youOwe as a positive magnitude", () => {
    const accounts = [
      makeAccount({ accountType: "credit-card", currentBalance: "-500.00" }),
      makeAccount({ accountType: "mortgage", currentBalance: "-200000.00" }),
    ];

    expect(summarizeAccounts(accounts)).toEqual({ youHave: 0, youOwe: 200500, difference: -200500 });
  });

  it("computes difference as youHave minus youOwe across a mixed portfolio", () => {
    const accounts = [
      makeAccount({ accountType: "checking", currentBalance: "8742.31" }),
      makeAccount({ accountType: "credit-card", currentBalance: "-1274.32" }),
    ];

    const summary = summarizeAccounts(accounts);

    expect(summary.youHave).toBe(8742.31);
    expect(summary.youOwe).toBe(1274.32);
    expect(summary.difference).toBeCloseTo(7467.99, 2);
  });

  it("treats a null currentBalance as zero", () => {
    const accounts = [makeAccount({ accountType: "checking", currentBalance: null })];

    expect(summarizeAccounts(accounts)).toEqual({ youHave: 0, youOwe: 0, difference: 0 });
  });

  it("returns all zeros for an empty account list", () => {
    expect(summarizeAccounts([])).toEqual({ youHave: 0, youOwe: 0, difference: 0 });
  });

  it("classifies every account type into exactly one side (asset or liability)", () => {
    const assetTypes: Account["accountType"][] = [
      "checking",
      "savings",
      "cash",
      "investment",
      "retirement",
      "property",
      "other-asset",
    ];
    const liabilityTypes: Account["accountType"][] = [
      "credit-card",
      "mortgage",
      "personal-loan",
      "vehicle-loan",
      "other-liability",
    ];

    for (const accountType of assetTypes) {
      const summary = summarizeAccounts([makeAccount({ accountType, currentBalance: "100.00" })]);
      expect(summary, `${accountType} should count toward youHave`).toEqual({
        youHave: 100,
        youOwe: 0,
        difference: 100,
      });
    }

    for (const accountType of liabilityTypes) {
      const summary = summarizeAccounts([makeAccount({ accountType, currentBalance: "-100.00" })]);
      expect(summary, `${accountType} should count toward youOwe`).toEqual({
        youHave: 0,
        youOwe: 100,
        difference: -100,
      });
    }
  });
});
