import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { Account } from "@/domains/accounts/types";
import type { Category } from "@/domains/categories/types";
import type { Transaction } from "@/domains/transactions/types";

import {
  buildTransactionsListView,
  decodeTransactionCursor,
  encodeTransactionCursor,
  TRANSACTIONS_PAGE_SIZE,
} from "./transactions-list-view";

function makeAccount(overrides: Partial<Account> = {}): Account {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: randomUUID(),
    institutionId: null,
    name: "Checking",
    accountType: "checking",
    maskedAccountNumber: null,
    currency: "USD",
    status: "active",
    balanceSource: "manual",
    currentBalance: null,
    openingDate: null,
    closingDate: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: randomUUID(),
    name: "Groceries",
    parentCategoryId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> & Pick<Transaction, "accountId">): Transaction {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: randomUUID(),
    categoryId: null,
    transactionDate: "2026-07-01",
    postingDate: null,
    originalDescription: "GENERIC TXN",
    merchant: null,
    amount: "-10.00",
    transactionType: "expense",
    isExcluded: false,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("buildTransactionsListView", () => {
  it("resolves account name, masked number, and category name for each item", () => {
    const account = makeAccount({ name: "Everyday Checking", maskedAccountNumber: "•••• 1234" });
    const category = makeCategory({ name: "Groceries" });
    const transaction = makeTransaction({ accountId: account.id, categoryId: category.id });

    const view = buildTransactionsListView({
      page: [transaction],
      summaryRows: [transaction],
      totalCount: 1,
      allAccounts: [account],
      categories: [category],
    });

    expect(view.items).toEqual([
      {
        transaction,
        accountName: "Everyday Checking",
        accountMaskedNumber: "•••• 1234",
        categoryName: "Groceries",
      },
    ]);
    expect(view.totalCount).toBe(1);
  });

  it("leaves accountMaskedNumber null when the account has none", () => {
    const account = makeAccount({ maskedAccountNumber: null });
    const transaction = makeTransaction({ accountId: account.id });

    const view = buildTransactionsListView({
      page: [transaction],
      summaryRows: [],
      totalCount: 1,
      allAccounts: [account],
      categories: [],
    });

    expect(view.items[0].accountMaskedNumber).toBeNull();
  });

  it("passes totalCount through unchanged", () => {
    const view = buildTransactionsListView({
      page: [],
      summaryRows: [],
      totalCount: 1234,
      allAccounts: [],
      categories: [],
    });

    expect(view.totalCount).toBe(1234);
  });

  it("resolves account name even for an archived account, but excludes it from accountOptions", () => {
    const archivedAccount = makeAccount({ name: "Old Card", status: "archived" });
    const transaction = makeTransaction({ accountId: archivedAccount.id });

    const view = buildTransactionsListView({
      page: [transaction],
      summaryRows: [transaction],
      totalCount: 0, allAccounts: [archivedAccount],
      categories: [],
    });

    expect(view.items[0].accountName).toBe("Old Card");
    expect(view.accountOptions).toEqual([]);
  });

  it("falls back to 'Unknown account' and null category when references don't resolve", () => {
    const transaction = makeTransaction({ accountId: randomUUID(), categoryId: randomUUID() });

    const view = buildTransactionsListView({ page: [transaction], summaryRows: [], totalCount: 0, allAccounts: [], categories: [] });

    expect(view.items[0]).toMatchObject({ accountName: "Unknown account", categoryName: null });
  });

  it("leaves categoryName null when the transaction has no category", () => {
    const account = makeAccount();
    const transaction = makeTransaction({ accountId: account.id, categoryId: null });

    const view = buildTransactionsListView({
      page: [transaction],
      summaryRows: [],
      totalCount: 0, allAccounts: [account],
      categories: [],
    });

    expect(view.items[0].categoryName).toBeNull();
  });

  describe("pagination", () => {
    it("reports hasMore=false and nextCursor=null when the page fits within one fetch", () => {
      const account = makeAccount();
      const page = Array.from({ length: 5 }, () => makeTransaction({ accountId: account.id }));

      const view = buildTransactionsListView({ page, summaryRows: [], totalCount: 0, allAccounts: [account], categories: [] });

      expect(view.hasMore).toBe(false);
      expect(view.nextCursor).toBeNull();
      expect(view.items).toHaveLength(5);
    });

    it("reports hasMore=true, trims to the page size, and encodes a cursor from the last kept item", () => {
      const account = makeAccount();
      // TRANSACTIONS_PAGE_SIZE + 1 rows simulates the "fetch one extra"
      // convention getTransactionsListView() uses to detect a next page.
      const page = Array.from({ length: TRANSACTIONS_PAGE_SIZE + 1 }, (_, i) =>
        makeTransaction({ accountId: account.id, transactionDate: "2026-07-01", originalDescription: `Txn ${i}` }),
      );

      const view = buildTransactionsListView({ page, summaryRows: [], totalCount: 0, allAccounts: [account], categories: [] });

      expect(view.hasMore).toBe(true);
      expect(view.items).toHaveLength(TRANSACTIONS_PAGE_SIZE);
      expect(view.nextCursor).not.toBeNull();

      const lastKeptItem = view.items[view.items.length - 1].transaction;
      const decoded = decodeTransactionCursor(view.nextCursor!);
      expect(decoded).toEqual({ transactionDate: lastKeptItem.transactionDate, id: lastKeptItem.id });
    });
  });

  describe("cursor encode/decode", () => {
    it("round-trips a cursor", () => {
      const cursor = { transactionDate: "2026-07-01", id: randomUUID() };
      expect(decodeTransactionCursor(encodeTransactionCursor(cursor))).toEqual(cursor);
    });

    it("fails safe (returns undefined) for a malformed or tampered cursor", () => {
      expect(decodeTransactionCursor("not-base64url-json")).toBeUndefined();
      expect(decodeTransactionCursor(Buffer.from("[]").toString("base64url"))).toBeUndefined();
      expect(decodeTransactionCursor(Buffer.from('{"transactionDate":"2026-07-01"}').toString("base64url"))).toBeUndefined();
    });
  });

  describe("income/expense summary", () => {
    it("sums income and expenses, excluding transfers from both sides", () => {
      const account = makeAccount();
      const summaryRows = [
        makeTransaction({ accountId: account.id, transactionType: "income", amount: "2500.00" }),
        makeTransaction({ accountId: account.id, transactionType: "expense", amount: "-45.00" }),
        makeTransaction({ accountId: account.id, transactionType: "expense", amount: "-30.00" }),
        makeTransaction({ accountId: account.id, transactionType: "transfer", amount: "-500.00" }),
      ];

      const view = buildTransactionsListView({ page: [], summaryRows, totalCount: 0, allAccounts: [account], categories: [] });

      expect(view.summary).toEqual({ income: 2500, expenses: 75, net: 2425 });
    });

    it("computes the summary from summaryRows, independent of the (possibly truncated) page", () => {
      const account = makeAccount();
      const page = [makeTransaction({ accountId: account.id, transactionType: "expense", amount: "-1.00" })];
      const summaryRows = [
        makeTransaction({ accountId: account.id, transactionType: "income", amount: "100.00" }),
        makeTransaction({ accountId: account.id, transactionType: "expense", amount: "-40.00" }),
      ];

      const view = buildTransactionsListView({ page, summaryRows, totalCount: 0, allAccounts: [account], categories: [] });

      expect(view.summary).toEqual({ income: 100, expenses: 40, net: 60 });
    });

    it("returns zeros for an empty result set", () => {
      const view = buildTransactionsListView({ page: [], summaryRows: [], totalCount: 0, allAccounts: [], categories: [] });

      expect(view.summary).toEqual({ income: 0, expenses: 0, net: 0 });
    });
  });

  describe("category spending breakdown", () => {
    it("groups expense amounts by category, sorted descending, with percentages summing to ~100", () => {
      const account = makeAccount();
      const groceries = makeCategory({ name: "Groceries" });
      const dining = makeCategory({ name: "Dining" });
      const summaryRows = [
        makeTransaction({ accountId: account.id, categoryId: groceries.id, transactionType: "expense", amount: "-60.00" }),
        makeTransaction({ accountId: account.id, categoryId: dining.id, transactionType: "expense", amount: "-20.00" }),
        makeTransaction({ accountId: account.id, categoryId: dining.id, transactionType: "expense", amount: "-20.00" }),
      ];

      const view = buildTransactionsListView({
        page: [],
        summaryRows,
        totalCount: 0,
        allAccounts: [account],
        categories: [groceries, dining],
      });

      expect(view.categoryBreakdown).toEqual([
        { categoryId: groceries.id, categoryName: "Groceries", amount: 60, percent: 60 },
        { categoryId: dining.id, categoryName: "Dining", amount: 40, percent: 40 },
      ]);
    });

    it("excludes income and transfers from the breakdown", () => {
      const account = makeAccount();
      const dining = makeCategory({ name: "Dining" });
      const summaryRows = [
        makeTransaction({ accountId: account.id, categoryId: dining.id, transactionType: "expense", amount: "-10.00" }),
        makeTransaction({ accountId: account.id, categoryId: dining.id, transactionType: "income", amount: "500.00" }),
        makeTransaction({ accountId: account.id, categoryId: dining.id, transactionType: "transfer", amount: "-100.00" }),
      ];

      const view = buildTransactionsListView({
        page: [],
        summaryRows,
        totalCount: 0,
        allAccounts: [account],
        categories: [dining],
      });

      expect(view.categoryBreakdown).toEqual([{ categoryId: dining.id, categoryName: "Dining", amount: 10, percent: 100 }]);
    });

    it("buckets uncategorized expenses under 'Uncategorized'", () => {
      const account = makeAccount();
      const summaryRows = [makeTransaction({ accountId: account.id, categoryId: null, transactionType: "expense", amount: "-25.00" })];

      const view = buildTransactionsListView({ page: [], summaryRows, totalCount: 0, allAccounts: [account], categories: [] });

      expect(view.categoryBreakdown).toEqual([{ categoryId: null, categoryName: "Uncategorized", amount: 25, percent: 100 }]);
    });

    it("folds categories past the top 6 into a trailing 'Other' entry, not a fabricated 7th+ series", () => {
      const account = makeAccount();
      const categories = Array.from({ length: 8 }, (_, i) => makeCategory({ name: `Cat ${i}` }));
      // Descending amounts so the last two (60, 50) fall out of the top 6.
      const summaryRows = categories.map((category, i) =>
        makeTransaction({
          accountId: account.id,
          categoryId: category.id,
          transactionType: "expense",
          amount: `-${100 - i * 10}.00`,
        }),
      );

      const view = buildTransactionsListView({ page: [], summaryRows, totalCount: 0, allAccounts: [account], categories });

      // Amounts are 100, 90, 80, 70, 60, 50, 40, 30 (total 520) — the top 6
      // (100..50, summing to 450) stay individual; the remaining 40 + 30 = 70
      // folds into "Other".
      expect(view.categoryBreakdown).toHaveLength(7);
      expect(view.categoryBreakdown[6]).toEqual({ categoryId: null, categoryName: "Other", amount: 70, percent: expect.closeTo(13.46, 1) });
      const totalPercent = view.categoryBreakdown.reduce((sum, item) => sum + item.percent, 0);
      expect(totalPercent).toBeCloseTo(100);
    });

    it("returns an empty array when there is no expense spend", () => {
      const view = buildTransactionsListView({ page: [], summaryRows: [], totalCount: 0, allAccounts: [], categories: [] });

      expect(view.categoryBreakdown).toEqual([]);
    });
  });
});
