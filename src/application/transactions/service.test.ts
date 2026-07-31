import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { NotFoundError, ValidationError } from "@/domains/errors";
import {
  FakeAccountRepository,
  FakeCategoryRepository,
  FakeTransactionRepository,
} from "@/application/test-support/repository-fakes";

import { TransactionService } from "./service";

describe("TransactionService", () => {
  let transactionRepository: FakeTransactionRepository;
  let accountRepository: FakeAccountRepository;
  let categoryRepository: FakeCategoryRepository;
  let service: TransactionService;
  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();

  beforeEach(() => {
    transactionRepository = new FakeTransactionRepository();
    accountRepository = new FakeAccountRepository();
    categoryRepository = new FakeCategoryRepository();
    service = new TransactionService(transactionRepository, accountRepository, categoryRepository);
  });

  it("creates a transaction against an owned account", async () => {
    const account = await accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });

    const transaction = await service.createTransaction({
      ownerId,
      accountId: account.id,
      transactionDate: "2026-07-05",
      originalDescription: "PAYCHECK",
      amount: "2500.00",
      transactionType: "income",
    });

    expect(transaction.id).toBeTruthy();
    expect(transaction.amount).toBe("2500.00");
  });

  it("rejects an account belonging to a different owner", async () => {
    const othersAccount = await accountRepository.create({
      ownerId: otherOwnerId,
      name: "Checking",
      accountType: "checking",
    });

    await expect(
      service.createTransaction({
        ownerId,
        accountId: othersAccount.id,
        transactionDate: "2026-07-05",
        originalDescription: "PAYCHECK",
        amount: "2500.00",
        transactionType: "income",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a category belonging to a different owner", async () => {
    const account = await accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });
    const othersCategory = await categoryRepository.create({ ownerId: otherOwnerId, name: "Groceries" });

    await expect(
      service.createTransaction({
        ownerId,
        accountId: account.id,
        categoryId: othersCategory.id,
        transactionDate: "2026-07-05",
        originalDescription: "GROCERY STORE",
        amount: "-50.00",
        transactionType: "expense",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a malformed amount", async () => {
    const account = await accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });

    await expect(
      service.createTransaction({
        ownerId,
        accountId: account.id,
        transactionDate: "2026-07-05",
        originalDescription: "PAYCHECK",
        amount: "not-a-number",
        transactionType: "income",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("excludes isExcluded transactions from listings by default", async () => {
    const account = await accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });
    await service.createTransaction({
      ownerId,
      accountId: account.id,
      transactionDate: "2026-07-05",
      originalDescription: "COFFEE",
      amount: "-4.50",
      transactionType: "expense",
      isExcluded: true,
    });

    const defaultList = await service.listTransactions(ownerId);
    const withExcluded = await service.listTransactions(ownerId, { includeExcluded: true });

    expect(defaultList).toHaveLength(0);
    expect(withExcluded).toHaveLength(1);
  });

  it("soft-deletes a transaction so it no longer resolves", async () => {
    const account = await accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });
    const transaction = await service.createTransaction({
      ownerId,
      accountId: account.id,
      transactionDate: "2026-07-05",
      originalDescription: "PAYCHECK",
      amount: "2500.00",
      transactionType: "income",
    });

    await service.deleteTransaction(transaction.id, ownerId);

    await expect(service.getTransaction(transaction.id, ownerId)).resolves.toBeNull();
  });
});
