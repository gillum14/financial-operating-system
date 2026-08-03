import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TransactionService } from "@/application/transactions/service";
import {
  FakeAccountRepository,
  FakeCategoryRepository,
  FakeTransactionRepository,
} from "@/application/test-support/repository-fakes";
import type { TransactionsListView } from "@/composition/transactions-query";

import { loadMoreTransactions, updateTransaction } from "./actions";

// vi.mock factories are hoisted above every other top-level statement, so
// anything they reference must come from vi.hoisted() rather than a plain
// const/let — see src/features/accounts/actions.test.ts for the same
// pattern and the TDZ pitfall it avoids.
const mockGetAuthenticatedUser = vi.hoisted(() => vi.fn());
const mockGetTransactionsListView = vi.hoisted(() => vi.fn());
const repos = vi.hoisted(() => ({
  transactionRepository: undefined as unknown as FakeTransactionRepository,
  accountRepository: undefined as unknown as FakeAccountRepository,
  categoryRepository: undefined as unknown as FakeCategoryRepository,
}));

vi.mock("@/lib/auth/authenticated-user", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// A real TransactionService over the in-memory fakes — see
// src/features/accounts/actions.test.ts for why this is safe without
// vi.resetModules(). Used by updateTransaction (a real mutation, worth
// exercising against real business logic).
vi.mock("@/composition/transactions-composition", () => ({
  getTransactionService: () =>
    new TransactionService(repos.transactionRepository, repos.accountRepository, repos.categoryRepository),
}));

// getTransactionsListView() does real repository I/O (see
// src/composition/transactions-query.ts) — its shaping logic is unit
// tested directly and DB-free in
// src/application/transactions/transactions-list-view.test.ts. Here, for
// loadMoreTransactions, only the *action's own* behavior (auth gate,
// validation, and correct passthrough of the session-derived ownerId) is
// under test, so the query layer is mocked wholesale rather than hitting
// a real database from a unit test.
vi.mock("@/composition/transactions-query", () => ({
  getTransactionsListView: mockGetTransactionsListView,
}));

function signInAs(userId: string) {
  mockGetAuthenticatedUser.mockResolvedValue({ id: userId, email: "person@example.com", emailConfirmedAt: null });
}

const emptyListView: TransactionsListView = {
  items: [],
  hasMore: false,
  nextCursor: null,
  totalCount: 0,
  summary: { income: 0, expenses: 0, net: 0 },
  categoryBreakdown: [],
  accountOptions: [],
  categoryOptions: [],
};

describe("Transactions Server Actions", () => {
  const ownerId = randomUUID();

  beforeEach(() => {
    mockGetAuthenticatedUser.mockReset();
    mockGetTransactionsListView.mockReset();
    mockGetTransactionsListView.mockResolvedValue(emptyListView);
    repos.transactionRepository = new FakeTransactionRepository();
    repos.accountRepository = new FakeAccountRepository();
    repos.categoryRepository = new FakeCategoryRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("updateTransaction", () => {
    it("fails with authentication category when unauthenticated", async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const result = await updateTransaction({ transactionId: randomUUID(), notes: "test" });

      expect(result).toMatchObject({ success: false, error: { category: "authentication" } });
    });

    it("fails with validation category on a malformed transactionId", async () => {
      signInAs(ownerId);

      const result = await updateTransaction({ transactionId: "not-a-uuid" });

      expect(result).toMatchObject({ success: false, error: { category: "validation" } });
    });

    it("recategorizes an owned transaction", async () => {
      signInAs(ownerId);
      const account = await repos.accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });
      const category = await repos.categoryRepository.create({ ownerId, name: "Groceries" });
      const transaction = await repos.transactionRepository.create({
        ownerId,
        accountId: account.id,
        transactionDate: "2026-07-05",
        originalDescription: "GROCERY STORE",
        amount: "-50.00",
        transactionType: "expense",
      });

      const result = await updateTransaction({ transactionId: transaction.id, categoryId: category.id });

      expect(result).toMatchObject({ success: true, data: { categoryId: category.id } });
    });

    it("denies updating another owner's transaction without confirming it exists", async () => {
      signInAs(ownerId);
      const account = await repos.accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });
      const transaction = await repos.transactionRepository.create({
        ownerId,
        accountId: account.id,
        transactionDate: "2026-07-05",
        originalDescription: "GROCERY STORE",
        amount: "-50.00",
        transactionType: "expense",
      });

      signInAs(randomUUID());
      const result = await updateTransaction({ transactionId: transaction.id, notes: "Hijacked" });

      expect(result).toMatchObject({ success: false, error: { category: "domain" } });
    });

    it("never leaks a raw infrastructure error", async () => {
      signInAs(ownerId);
      const account = await repos.accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });
      const transaction = await repos.transactionRepository.create({
        ownerId,
        accountId: account.id,
        transactionDate: "2026-07-05",
        originalDescription: "GROCERY STORE",
        amount: "-50.00",
        transactionType: "expense",
      });
      const dbError = new Error("duplicate key value violates unique constraint (secret detail)");
      dbError.name = "DrizzleQueryError";
      vi.spyOn(repos.transactionRepository, "update").mockRejectedValueOnce(dbError);

      const result = await updateTransaction({ transactionId: transaction.id, notes: "test" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("expected failure");
      expect(result.error.category).toBe("infrastructure");
      expect(JSON.stringify(result.error)).not.toContain("secret");
    });
  });

  describe("loadMoreTransactions", () => {
    it("fails with authentication category when unauthenticated, never calling the query layer", async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const result = await loadMoreTransactions({});

      expect(result).toMatchObject({ success: false, error: { category: "authentication" } });
      expect(mockGetTransactionsListView).not.toHaveBeenCalled();
    });

    it("fails with validation category on a malformed filter, never calling the query layer", async () => {
      signInAs(ownerId);

      const result = await loadMoreTransactions({ accountId: "not-a-uuid" });

      expect(result).toMatchObject({ success: false, error: { category: "validation" } });
      expect(mockGetTransactionsListView).not.toHaveBeenCalled();
    });

    it("passes the session-derived ownerId and the requested filters through to the query layer", async () => {
      signInAs(ownerId);
      const accountId = randomUUID();
      mockGetTransactionsListView.mockResolvedValue(emptyListView);

      const result = await loadMoreTransactions({ accountId, search: "coffee" });

      expect(result).toMatchObject({ success: true, data: emptyListView });
      expect(mockGetTransactionsListView).toHaveBeenCalledWith(ownerId, expect.objectContaining({ accountId, search: "coffee" }));
    });

    it("ignores an ownerId-shaped field even if present in raw input — only requireActionUser()'s id is ever used", async () => {
      signInAs(ownerId);

      await loadMoreTransactions({ accountId: randomUUID(), ownerId: "attacker-controlled-id" });

      const [passedOwnerId] = mockGetTransactionsListView.mock.calls[0];
      expect(passedOwnerId).toBe(ownerId);
      expect(passedOwnerId).not.toBe("attacker-controlled-id");
    });

    it("never leaks a raw infrastructure error from the query layer", async () => {
      signInAs(ownerId);
      const dbError = new Error("connection to server failed (secret detail)");
      dbError.name = "PostgresError";
      mockGetTransactionsListView.mockRejectedValueOnce(dbError);

      const result = await loadMoreTransactions({});

      expect(result.success).toBe(false);
      if (result.success) throw new Error("expected failure");
      expect(result.error.category).toBe("infrastructure");
      expect(JSON.stringify(result.error)).not.toContain("secret");
    });
  });
});
