import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { Transaction } from "@/domains/transactions/types";

import { computeCategorySpendForPeriod } from "./spending-aggregation";

const ownerId = randomUUID();
const accountId = randomUUID();

function makeTransaction(overrides: Partial<Transaction> & Pick<Transaction, "transactionType" | "amount">): Transaction {
  return {
    id: randomUUID(),
    ownerId,
    accountId,
    categoryId: null,
    transactionDate: "2026-08-05",
    postingDate: null,
    originalDescription: "TEST TXN",
    merchant: null,
    isExcluded: false,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("computeCategorySpendForPeriod", () => {
  it("standard spending: expense rows sum as positive actual spend", () => {
    const categoryId = randomUUID();
    const rows = [makeTransaction({ categoryId, transactionType: "expense", amount: "-50.00" })];

    const result = computeCategorySpendForPeriod(rows);

    expect(result.get(categoryId)).toBe(50);
  });

  it("refunds: an income row in the same category nets against expense spend", () => {
    const categoryId = randomUUID();
    const rows = [
      makeTransaction({ categoryId, transactionType: "expense", amount: "-200.00" }),
      makeTransaction({ categoryId, transactionType: "income", amount: "60.00" }),
    ];

    const result = computeCategorySpendForPeriod(rows);

    expect(result.get(categoryId)).toBe(140);
  });

  it("refunds: a refund-only category (no matching purchase) nets negative", () => {
    const categoryId = randomUUID();
    const rows = [makeTransaction({ categoryId, transactionType: "income", amount: "111.52" })];

    const result = computeCategorySpendForPeriod(rows);

    expect(result.get(categoryId)).toBe(-111.52);
  });

  it("transfers: transfer-typed rows never contribute to any category's actual spend", () => {
    const categoryId = randomUUID();
    const rows = [
      // Transfers in this codebase carry categoryId: null by convention,
      // but even a (hypothetically) categorized transfer must still be
      // excluded — the type check, not the null categoryId, is what
      // excludes it here.
      makeTransaction({ categoryId, transactionType: "transfer", amount: "-500.00" }),
      makeTransaction({ categoryId, transactionType: "transfer", amount: "500.00" }),
    ];

    const result = computeCategorySpendForPeriod(rows);

    expect(result.has(categoryId)).toBe(false);
  });

  it("uncategorized: null-category rows are dropped entirely, never bucketed under a fake key", () => {
    const rows = [makeTransaction({ categoryId: null, transactionType: "expense", amount: "-40.00" })];

    const result = computeCategorySpendForPeriod(rows);

    expect(result.size).toBe(0);
  });

  it("excluded transactions: this function trusts the caller already filtered them out (repository-layer concern)", () => {
    // isExcluded: true rows are expected to never reach this function in
    // practice (the repository's includeExcluded: false default drops
    // them before the query even returns) — this test documents that
    // computeCategorySpendForPeriod itself does not re-check isExcluded,
    // matching every other function in this file.
    const categoryId = randomUUID();
    const rows = [makeTransaction({ categoryId, transactionType: "expense", amount: "-40.00", isExcluded: true })];

    const result = computeCategorySpendForPeriod(rows);

    expect(result.get(categoryId)).toBe(40);
  });

  it("avoids double counting: multiple rows in the same category accumulate, not overwrite", () => {
    const categoryId = randomUUID();
    const rows = [
      makeTransaction({ categoryId, transactionType: "expense", amount: "-10.00" }),
      makeTransaction({ categoryId, transactionType: "expense", amount: "-15.00" }),
      makeTransaction({ categoryId, transactionType: "expense", amount: "-5.00" }),
    ];

    const result = computeCategorySpendForPeriod(rows);

    expect(result.get(categoryId)).toBe(30);
  });

  it("empty input produces an empty map, not a fabricated zero entry", () => {
    expect(computeCategorySpendForPeriod([]).size).toBe(0);
  });
});
