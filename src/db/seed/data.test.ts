import { describe, expect, it } from "vitest";

import { computeNetWorthBreakdown } from "@/application/net-worth/net-worth-breakdown";
import type { Account } from "@/db/schema/accounts";
import type { NewTransaction } from "@/db/schema/transactions";

import { buildDevData } from "./data";
import { fixtureId, LEGACY_SEED_OWNER_ID } from "./deterministic";

// Same id used throughout local dev — see docs/development-seed-baseline.md.
// Fixture generation doesn't touch a database, so any well-formed UUID works
// here; this one just matches what a real seed run uses.
const OWNER_ID = LEGACY_SEED_OWNER_ID;
// A second, unrelated owner — stands in for any future seed owner. Not a
// real user in any environment this test runs in; fixture generation never
// touches a database.
const OTHER_OWNER_ID = "7a02431b-b4fb-4e30-a77f-e0cc8ddbad5a";

function ids<T extends { id?: string }>(rows: T[]): string[] {
  return rows.map((row) => {
    // Every fixture sets a deterministic id explicitly (see deterministic.ts)
    // — id is only optional in the insert type because the column has a
    // database default. A missing one here means a fixture regressed.
    if (!row.id) throw new Error("fixture row is missing its deterministic id");
    return row.id;
  });
}

function assertNoDuplicates(rows: { id?: string }[]): void {
  const rowIds = ids(rows);
  expect(new Set(rowIds).size).toBe(rowIds.length);
}

describe("development seed fixtures", () => {
  const data = buildDevData(OWNER_ID);

  it("produces row counts within the sandbox targets", () => {
    expect(data.devAccounts.length).toBeGreaterThanOrEqual(10);
    expect(data.devAccounts.length).toBeLessThanOrEqual(12);

    const totalCategories = data.devParentCategories.length + data.devChildCategories.length;
    expect(totalCategories).toBeGreaterThanOrEqual(35);
    expect(totalCategories).toBeLessThanOrEqual(50);

    expect(data.devTransactions.length).toBeGreaterThanOrEqual(1000);
    expect(data.devTransactions.length).toBeLessThanOrEqual(2000);

    expect(data.devDataProviderConnections.length).toBeGreaterThanOrEqual(1);
    expect(data.devDataProviderConnections.length).toBeLessThanOrEqual(2);
  });

  it("has no duplicate deterministic ids within any table", () => {
    assertNoDuplicates(data.devInstitutions);
    assertNoDuplicates(data.devParentCategories);
    assertNoDuplicates(data.devChildCategories);
    assertNoDuplicates(data.devAccounts);
    assertNoDuplicates(data.devTransactions);
    assertNoDuplicates(data.devDataProviderConnections);
  });

  it("has no id collisions across tables", () => {
    // Ids are UUIDv5s namespaced by a "<table>:<slug>" style name string, so
    // a collision here would mean two fixtures accidentally share a name —
    // worth catching even though every table is a separate primary key.
    const allIds = [
      ...ids(data.devInstitutions),
      ...ids(data.devParentCategories),
      ...ids(data.devChildCategories),
      ...ids(data.devAccounts),
      ...ids(data.devTransactions),
      ...ids(data.devDataProviderConnections),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("keeps category hierarchy exactly two levels deep", () => {
    for (const parent of data.devParentCategories) {
      expect(parent.parentCategoryId ?? null).toBeNull();
    }

    const parentIds = new Set(ids(data.devParentCategories));
    for (const child of data.devChildCategories) {
      expect(child.parentCategoryId).not.toBeNull();
      expect(parentIds.has(child.parentCategoryId as string)).toBe(true);
    }
  });

  it("resolves every transaction's account reference", () => {
    const accountIds = new Set(ids(data.devAccounts));
    for (const txn of data.devTransactions) {
      expect(accountIds.has(txn.accountId)).toBe(true);
    }
  });

  it("resolves every transaction's category reference, when present", () => {
    const categoryIds = new Set([...ids(data.devParentCategories), ...ids(data.devChildCategories)]);
    for (const txn of data.devTransactions) {
      if (txn.categoryId === null || txn.categoryId === undefined) continue;
      expect(categoryIds.has(txn.categoryId)).toBe(true);
    }
  });

  it("stamps every row with the seed owner — ownership never diverges from account ownership", () => {
    for (const account of data.devAccounts) {
      expect(account.ownerId).toBe(OWNER_ID);
    }
    for (const txn of data.devTransactions) {
      expect(txn.ownerId).toBe(OWNER_ID);
    }
    for (const category of [...data.devParentCategories, ...data.devChildCategories]) {
      expect(category.ownerId).toBe(OWNER_ID);
    }
    for (const connection of data.devDataProviderConnections) {
      expect(connection.ownerId).toBe(OWNER_ID);
    }
  });

  it("keeps every transfer pair balanced to zero net movement", () => {
    const transferSum = data.devTransactions
      .filter((txn) => txn.transactionType === "transfer")
      .reduce((sum, txn) => sum + Number(txn.amount), 0);

    expect(transferSum).toBeCloseTo(0, 2);
  });

  it("never lets a transfer affect income or expense totals directly", () => {
    // spending-aggregation.ts / dashboard-service.ts already filter these
    // out — this just guards that every transfer row is actually typed
    // "transfer" (categoryId: null is the existing convention, not a rule
    // enforced elsewhere, so it's checked here instead).
    for (const txn of data.devTransactions) {
      if (txn.transactionType === "transfer") {
        expect(txn.categoryId).toBeNull();
      }
    }
  });

  it("keeps every transaction date within the seeded account-history window", () => {
    const accountsById = new Map(data.devAccounts.map((account) => [account.id, account]));
    for (const txn of data.devTransactions) {
      const account = accountsById.get(txn.accountId);
      expect(account).toBeDefined();
      if (!account?.openingDate) continue;
      expect(txn.transactionDate >= account.openingDate).toBe(true);
    }
  });

  it("reconciles account balances into a finite, internally consistent net worth", () => {
    // computeNetWorthBreakdown only reads currentBalance/accountType, so a
    // NewAccount fixture (missing audit columns a real select row would
    // have) is a safe stand-in here — no database round trip required.
    const breakdown = computeNetWorthBreakdown(data.devAccounts as unknown as Account[]);

    expect(Number.isFinite(breakdown.netWorth)).toBe(true);
    expect(breakdown.totalAssets).toBeGreaterThan(0);
    expect(breakdown.totalLiabilities).toBeGreaterThan(0);
    expect(breakdown.netWorth).toBeCloseTo(breakdown.totalAssets - breakdown.totalLiabilities, 2);
  });

  it("produces byte-for-byte identical output on repeated builds (deterministic, no Math.random)", () => {
    const rebuilt = buildDevData(OWNER_ID);

    expect(rebuilt.devAccounts).toEqual(data.devAccounts);
    expect(rebuilt.devTransactions).toEqual(data.devTransactions);
    expect(rebuilt.devParentCategories).toEqual(data.devParentCategories);
    expect(rebuilt.devChildCategories).toEqual(data.devChildCategories);
    expect(rebuilt.devInstitutions).toEqual(data.devInstitutions);
    expect(rebuilt.devDataProviderConnections).toEqual(data.devDataProviderConnections);
  });

  it("never types a row negative/positive inconsistently with its transaction type", () => {
    // Expenses and outgoing transfer legs are stored as negative amounts,
    // income and incoming transfer legs as positive — this mirrors the
    // original seed data's own sign convention (see fixtures/transactions
    // generators). Only income/expense are checked for sign here; transfer
    // legs can be either sign depending on direction, which the balanced-
    // pair test above already covers.
    const byType = (type: NewTransaction["transactionType"]) =>
      data.devTransactions.filter((txn) => txn.transactionType === type);

    for (const txn of byType("expense")) {
      expect(Number(txn.amount)).toBeLessThan(0);
    }
    for (const txn of byType("income")) {
      expect(Number(txn.amount)).toBeGreaterThan(0);
    }
  });
});

describe("owner-scoped fixture ids", () => {
  it("gives the same owner + the same fixture key the same id every time", () => {
    expect(fixtureId(OTHER_OWNER_ID, "account:checking")).toBe(fixtureId(OTHER_OWNER_ID, "account:checking"));
  });

  it("gives different owners different ids for the same fixture key", () => {
    expect(fixtureId(OWNER_ID, "account:checking")).not.toBe(fixtureId(OTHER_OWNER_ID, "account:checking"));
  });

  it("preserves the legacy owner's original literal id instead of deriving one", () => {
    const legacyChecking = "00000000-0000-0000-0000-000000000301";
    expect(fixtureId(LEGACY_SEED_OWNER_ID, "account:checking", legacyChecking)).toBe(legacyChecking);
    // A non-legacy owner ignores the legacy literal entirely — it always
    // gets its own derived id, never someone else's fixed row.
    expect(fixtureId(OTHER_OWNER_ID, "account:checking", legacyChecking)).not.toBe(legacyChecking);
  });

  it("lets two owners coexist with fully independent, collision-free datasets", () => {
    const legacyData = buildDevData(OWNER_ID);
    const otherData = buildDevData(OTHER_OWNER_ID);

    const legacyIds = new Set([
      ...legacyData.devAccounts.map((row) => row.id),
      ...legacyData.devParentCategories.map((row) => row.id),
      ...legacyData.devChildCategories.map((row) => row.id),
      ...legacyData.devTransactions.map((row) => row.id),
      ...legacyData.devDataProviderConnections.map((row) => row.id),
    ]);
    const otherIds = new Set([
      ...otherData.devAccounts.map((row) => row.id),
      ...otherData.devParentCategories.map((row) => row.id),
      ...otherData.devChildCategories.map((row) => row.id),
      ...otherData.devTransactions.map((row) => row.id),
      ...otherData.devDataProviderConnections.map((row) => row.id),
    ]);

    const overlap = [...legacyIds].filter((id) => otherIds.has(id));
    expect(overlap).toEqual([]);

    // Same row counts for both — the second owner gets a complete,
    // independent sandbox, not a partial one.
    expect(otherData.devAccounts.length).toBe(legacyData.devAccounts.length);
    expect(otherData.devTransactions.length).toBe(legacyData.devTransactions.length);
    expect(otherData.devParentCategories.length + otherData.devChildCategories.length).toBe(
      legacyData.devParentCategories.length + legacyData.devChildCategories.length,
    );
  });

  it("shares institutions across owners instead of duplicating them (the one genuinely global table)", () => {
    const legacyData = buildDevData(OWNER_ID);
    const otherData = buildDevData(OTHER_OWNER_ID);

    expect(otherData.devInstitutions).toEqual(legacyData.devInstitutions);
  });

  it("is idempotent per owner: rerunning buildDevData for a non-legacy owner produces identical output", () => {
    const first = buildDevData(OTHER_OWNER_ID);
    const second = buildDevData(OTHER_OWNER_ID);

    expect(second.devAccounts).toEqual(first.devAccounts);
    expect(second.devTransactions).toEqual(first.devTransactions);
    expect(second.devParentCategories).toEqual(first.devParentCategories);
    expect(second.devChildCategories).toEqual(first.devChildCategories);
    expect(second.devDataProviderConnections).toEqual(first.devDataProviderConnections);
  });
});
