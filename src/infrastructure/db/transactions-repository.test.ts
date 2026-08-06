import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { NotFoundError } from "@/domains/errors";

import { DrizzleAccountRepository } from "./accounts-repository";
import { DrizzleTransactionRepository } from "./transactions-repository";
import { createTestAuthUser } from "./test-support/create-test-auth-user";
import { createTestDbClient, isDbTestingAllowed } from "./test-support/test-db-client";
import { withRollback } from "./test-support/with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

describe.skipIf(!hasDatabase)("DrizzleTransactionRepository (integration)", () => {
  let db: DbClient;
  let close: () => Promise<void>;

  beforeAll(() => {
    const client = createTestDbClient();
    db = client.db;
    close = client.close;
  });

  afterAll(async () => {
    await close();
  });

  it("does not return another owner's transactions", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const transactions = new DrizzleTransactionRepository(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);
      const accountA = await accounts.create({ ownerId: ownerA.id, name: "A's Checking", accountType: "checking" });
      const accountB = await accounts.create({ ownerId: ownerB.id, name: "B's Checking", accountType: "checking" });

      await transactions.create({
        ownerId: ownerA.id,
        accountId: accountA.id,
        transactionDate: "2026-07-01",
        originalDescription: "A's coffee",
        amount: "-4.50",
        transactionType: "expense",
      });
      await transactions.create({
        ownerId: ownerB.id,
        accountId: accountB.id,
        transactionDate: "2026-07-01",
        originalDescription: "B's coffee",
        amount: "-4.50",
        transactionType: "expense",
      });

      const ownerATransactions = await transactions.listForOwner(ownerA.id);

      expect(ownerATransactions).toHaveLength(1);
      expect(ownerATransactions[0].originalDescription).toBe("A's coffee");
    });
  });

  it("returns rows ordered by transactionDate desc, id desc — deterministic even for same-day rows", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const transactions = new DrizzleTransactionRepository(tx);
      const owner = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });

      await transactions.create({
        ownerId: owner.id,
        accountId: account.id,
        transactionDate: "2026-07-01",
        originalDescription: "Older",
        amount: "-1.00",
        transactionType: "expense",
      });
      await transactions.create({
        ownerId: owner.id,
        accountId: account.id,
        transactionDate: "2026-07-05",
        originalDescription: "Newest",
        amount: "-1.00",
        transactionType: "expense",
      });
      await transactions.create({
        ownerId: owner.id,
        accountId: account.id,
        transactionDate: "2026-07-03",
        originalDescription: "Middle",
        amount: "-1.00",
        transactionType: "expense",
      });

      const first = await transactions.listForOwner(owner.id);
      const second = await transactions.listForOwner(owner.id);

      expect(first.map((t) => t.originalDescription)).toEqual(["Newest", "Middle", "Older"]);
      expect(second.map((t) => t.id)).toEqual(first.map((t) => t.id));
    });
  });

  it("paginates with a keyset cursor without gaps or overlaps across pages", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const transactions = new DrizzleTransactionRepository(tx);
      const owner = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });

      for (let i = 0; i < 5; i++) {
        await transactions.create({
          ownerId: owner.id,
          accountId: account.id,
          transactionDate: `2026-07-0${i + 1}`,
          originalDescription: `Txn ${i}`,
          amount: "-1.00",
          transactionType: "expense",
        });
      }

      const all = await transactions.listForOwner(owner.id);
      expect(all).toHaveLength(5);

      const pageOne = await transactions.listForOwner(owner.id, { limit: 2 });
      expect(pageOne).toHaveLength(2);
      const lastOfPageOne = pageOne[pageOne.length - 1];

      const pageTwo = await transactions.listForOwner(owner.id, {
        limit: 2,
        cursor: { transactionDate: lastOfPageOne.transactionDate, id: lastOfPageOne.id },
      });
      expect(pageTwo).toHaveLength(2);

      const pageOneIds = new Set(pageOne.map((t) => t.id));
      const pageTwoIds = new Set(pageTwo.map((t) => t.id));
      expect(pageOneIds.intersection(pageTwoIds).size).toBe(0);
      expect([...pageOneIds, ...pageTwoIds]).toEqual(all.slice(0, 4).map((t) => t.id));
    });
  });

  it("filters by accountId, transactionType, and date range", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const transactions = new DrizzleTransactionRepository(tx);
      const owner = await createTestAuthUser(tx);
      const checking = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });
      const savings = await accounts.create({ ownerId: owner.id, name: "Savings", accountType: "savings" });

      await transactions.create({
        ownerId: owner.id,
        accountId: checking.id,
        transactionDate: "2026-06-01",
        originalDescription: "June expense",
        amount: "-10.00",
        transactionType: "expense",
      });
      await transactions.create({
        ownerId: owner.id,
        accountId: checking.id,
        transactionDate: "2026-07-01",
        originalDescription: "July paycheck",
        amount: "2500.00",
        transactionType: "income",
      });
      await transactions.create({
        ownerId: owner.id,
        accountId: savings.id,
        transactionDate: "2026-07-01",
        originalDescription: "July savings transfer",
        amount: "100.00",
        transactionType: "transfer",
      });

      await expect(transactions.listForOwner(owner.id, { accountId: checking.id })).resolves.toHaveLength(2);
      await expect(transactions.listForOwner(owner.id, { transactionType: "income" })).resolves.toHaveLength(1);
      await expect(
        transactions.listForOwner(owner.id, { dateFrom: "2026-07-01", dateTo: "2026-07-31" }),
      ).resolves.toHaveLength(2);
    });
  });

  it("searches description and merchant case-insensitively", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const transactions = new DrizzleTransactionRepository(tx);
      const owner = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });

      await transactions.create({
        ownerId: owner.id,
        accountId: account.id,
        transactionDate: "2026-07-01",
        originalDescription: "TRADER JOES #123",
        merchant: "Trader Joe's",
        amount: "-45.00",
        transactionType: "expense",
      });
      await transactions.create({
        ownerId: owner.id,
        accountId: account.id,
        transactionDate: "2026-07-02",
        originalDescription: "SHELL OIL",
        amount: "-30.00",
        transactionType: "expense",
      });

      await expect(transactions.listForOwner(owner.id, { search: "trader" })).resolves.toHaveLength(1);
      await expect(transactions.listForOwner(owner.id, { search: "shell" })).resolves.toHaveLength(1);
      await expect(transactions.listForOwner(owner.id, { search: "nonexistent" })).resolves.toHaveLength(0);
    });
  });

  it("excludes isExcluded transactions by default and includes them with includeExcluded", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const transactions = new DrizzleTransactionRepository(tx);
      const owner = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });

      await transactions.create({
        ownerId: owner.id,
        accountId: account.id,
        transactionDate: "2026-07-01",
        originalDescription: "Internal transfer",
        amount: "-100.00",
        transactionType: "transfer",
        isExcluded: true,
      });

      await expect(transactions.listForOwner(owner.id)).resolves.toHaveLength(0);
      await expect(transactions.listForOwner(owner.id, { includeExcluded: true })).resolves.toHaveLength(1);
    });
  });

  it("updates mutable fields, including recategorization, without changing ownership", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const transactions = new DrizzleTransactionRepository(tx);
      const owner = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });
      const transaction = await transactions.create({
        ownerId: owner.id,
        accountId: account.id,
        transactionDate: "2026-07-01",
        originalDescription: "GROCERY STORE",
        amount: "-50.00",
        transactionType: "expense",
      });

      const updated = await transactions.update(transaction.id, owner.id, { notes: "Split with roommate" });

      expect(updated.notes).toBe("Split with roommate");
      expect(updated.ownerId).toBe(owner.id);
    });
  });

  it("throws NotFoundError updating another owner's transaction", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const transactions = new DrizzleTransactionRepository(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: ownerA.id, name: "Checking", accountType: "checking" });
      const transaction = await transactions.create({
        ownerId: ownerA.id,
        accountId: account.id,
        transactionDate: "2026-07-01",
        originalDescription: "GROCERY STORE",
        amount: "-50.00",
        transactionType: "expense",
      });

      await expect(
        transactions.update(transaction.id, ownerB.id, { notes: "Hijacked" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it("countForOwner matches listForOwner's row count under the same filters, ignoring limit/cursor", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const transactions = new DrizzleTransactionRepository(tx);
      const owner = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });

      for (let i = 0; i < 5; i++) {
        await transactions.create({
          ownerId: owner.id,
          accountId: account.id,
          transactionDate: `2026-07-0${i + 1}`,
          originalDescription: `Txn ${i}`,
          amount: "-1.00",
          transactionType: "expense",
        });
      }

      await expect(transactions.countForOwner(owner.id)).resolves.toBe(5);
      await expect(transactions.countForOwner(owner.id, { limit: 2 })).resolves.toBe(5);
      await expect(transactions.countForOwner(owner.id, { dateFrom: "2026-07-03" })).resolves.toBe(3);
    });
  });

  it("sorts ascending when requested, and a cursor taken from an asc page continues in the same direction", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const transactions = new DrizzleTransactionRepository(tx);
      const owner = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });

      for (let i = 0; i < 3; i++) {
        await transactions.create({
          ownerId: owner.id,
          accountId: account.id,
          transactionDate: `2026-07-0${i + 1}`,
          originalDescription: `Txn ${i}`,
          amount: "-1.00",
          transactionType: "expense",
        });
      }

      const ascAll = await transactions.listForOwner(owner.id, { sort: "asc" });
      expect(ascAll.map((t) => t.transactionDate)).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);

      const firstPage = await transactions.listForOwner(owner.id, { sort: "asc", limit: 1 });
      const cursorRow = firstPage[0];
      const secondPage = await transactions.listForOwner(owner.id, {
        sort: "asc",
        cursor: { transactionDate: cursorRow.transactionDate, id: cursorRow.id },
      });

      expect(secondPage.map((t) => t.transactionDate)).toEqual(["2026-07-02", "2026-07-03"]);
    });
  });
});
