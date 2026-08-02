import { randomUUID } from "node:crypto";

import { describe, expect, expectTypeOf, it } from "vitest";

import { AccountService } from "@/application/accounts/service";
import { CategoryService } from "@/application/categories/service";
import { DataProviderConnectionService } from "@/application/data-provider-connections/service";
import {
  FakeAccountRepository,
  FakeCategoryRepository,
  FakeDataProviderConnectionRepository,
  FakeInstitutionRepository,
  FakeTransactionRepository,
  FakeUserRepository,
} from "@/application/test-support/repository-fakes";
import { TransactionService } from "@/application/transactions/service";
import { UserService } from "@/application/users/service";
import type { AccountUpdateInput } from "@/domains/accounts/types";
import type { CategoryUpdateInput } from "@/domains/categories/types";
import type { DataProviderConnectionUpdateInput } from "@/domains/data-provider-connections/types";
import type { TransactionUpdateInput } from "@/domains/transactions/types";
import type { UserUpdateInput } from "@/domains/users/types";

// RLS's WITH CHECK is the database-level backstop (verified live in
// src/infrastructure/db/rls-policies.test.ts) but is explicitly not
// considered sufficient on its own — this file verifies the layers in
// front of it: the update input types cannot express an ownership change
// at compile time, and even a value that bypasses TypeScript (a genuinely
// "crafted request" — untyped JSON from the wire, forced through with an
// `as` cast) is silently stripped by the service's zod schema before it
// ever reaches a repository.
describe("ownership immutability", () => {
  describe("update input types do not permit ownerId (or id) changes", () => {
    it("AccountUpdateInput", () => {
      expectTypeOf<AccountUpdateInput>().not.toHaveProperty("ownerId");
      expectTypeOf<AccountUpdateInput>().not.toHaveProperty("id");
    });

    it("CategoryUpdateInput", () => {
      expectTypeOf<CategoryUpdateInput>().not.toHaveProperty("ownerId");
      expectTypeOf<CategoryUpdateInput>().not.toHaveProperty("id");
    });

    it("TransactionUpdateInput", () => {
      expectTypeOf<TransactionUpdateInput>().not.toHaveProperty("ownerId");
      expectTypeOf<TransactionUpdateInput>().not.toHaveProperty("id");
      // accountId is also immutable via ordinary update — a transaction
      // doesn't move between accounts after the fact.
      expectTypeOf<TransactionUpdateInput>().not.toHaveProperty("accountId");
    });

    it("DataProviderConnectionUpdateInput", () => {
      expectTypeOf<DataProviderConnectionUpdateInput>().not.toHaveProperty("ownerId");
      expectTypeOf<DataProviderConnectionUpdateInput>().not.toHaveProperty("id");
    });

    it("UserUpdateInput", () => {
      expectTypeOf<UserUpdateInput>().not.toHaveProperty("id");
    });
  });

  describe("a crafted request cannot reassign ownership through the service layer", () => {
    const ownerA = randomUUID();
    const ownerB = randomUUID();

    it("AccountService.updateAccount ignores an injected ownerId", async () => {
      const accountRepository = new FakeAccountRepository();
      const institutionRepository = new FakeInstitutionRepository();
      const service = new AccountService(accountRepository, institutionRepository);

      const account = await accountRepository.create({ ownerId: ownerA, name: "Checking", accountType: "checking" });

      // Simulates a request handler that naively forwards parsed JSON
      // straight to the service without trusting the TypeScript type —
      // exactly the crafted-request scenario this guards against.
      const crafted = { name: "Renamed", ownerId: ownerB } as unknown as AccountUpdateInput;
      const updated = await service.updateAccount(account.id, ownerA, crafted);

      expect(updated.ownerId).toBe(ownerA);
      expect(updated.name).toBe("Renamed");
    });

    it("CategoryService.updateCategory ignores an injected ownerId", async () => {
      const categoryRepository = new FakeCategoryRepository();
      const transactionRepository = new FakeTransactionRepository();
      const service = new CategoryService(categoryRepository, transactionRepository);

      const category = await categoryRepository.create({ ownerId: ownerA, name: "Housing" });

      const crafted = { name: "Renamed", ownerId: ownerB } as unknown as CategoryUpdateInput;
      const updated = await service.updateCategory(category.id, ownerA, crafted);

      expect(updated.ownerId).toBe(ownerA);
    });

    it("TransactionService.updateTransaction ignores an injected ownerId", async () => {
      const transactionRepository = new FakeTransactionRepository();
      const accountRepository = new FakeAccountRepository();
      const categoryRepository = new FakeCategoryRepository();
      const service = new TransactionService(transactionRepository, accountRepository, categoryRepository);

      const account = await accountRepository.create({ ownerId: ownerA, name: "Checking", accountType: "checking" });
      const transaction = await transactionRepository.create({
        ownerId: ownerA,
        accountId: account.id,
        transactionDate: "2026-08-01",
        originalDescription: "Groceries",
        amount: "-10.00",
        transactionType: "expense",
      });

      const crafted = { notes: "edited", ownerId: ownerB } as unknown as TransactionUpdateInput;
      const updated = await service.updateTransaction(transaction.id, ownerA, crafted);

      expect(updated.ownerId).toBe(ownerA);
    });

    it("DataProviderConnectionService.updateConnection ignores an injected ownerId", async () => {
      const connectionRepository = new FakeDataProviderConnectionRepository();
      const institutionRepository = new FakeInstitutionRepository();
      const service = new DataProviderConnectionService(connectionRepository, institutionRepository);

      const connection = await connectionRepository.create({ ownerId: ownerA, providerName: "manual" });

      const crafted = { status: "error", ownerId: ownerB } as unknown as DataProviderConnectionUpdateInput;
      const updated = await service.updateConnection(connection.id, ownerA, crafted);

      expect(updated.ownerId).toBe(ownerA);
    });

    it("UserService.updateUser ignores an injected id", async () => {
      const userRepository = new FakeUserRepository();
      const service = new UserService(userRepository);

      const user = await userRepository.create({ id: ownerA, email: "a@example.com", displayName: "Owner A" });

      const crafted = { displayName: "Renamed", id: ownerB } as unknown as UserUpdateInput;
      const updated = await service.updateUser(user.id, crafted);

      expect(updated.id).toBe(ownerA);
    });
  });
});
