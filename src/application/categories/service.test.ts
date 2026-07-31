import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError, NotFoundError } from "@/domains/errors";
import {
  FakeCategoryRepository,
  FakeTransactionRepository,
} from "@/application/test-support/repository-fakes";

import { CategoryService } from "./service";

describe("CategoryService", () => {
  let categoryRepository: FakeCategoryRepository;
  let transactionRepository: FakeTransactionRepository;
  let service: CategoryService;
  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();

  beforeEach(() => {
    categoryRepository = new FakeCategoryRepository();
    transactionRepository = new FakeTransactionRepository();
    service = new CategoryService(categoryRepository, transactionRepository);
  });

  it("creates a top-level category", async () => {
    const category = await service.createCategory({ ownerId, name: "Housing" });

    expect(category.id).toBeTruthy();
    expect(category.parentCategoryId).toBeNull();
  });

  it("creates a child category under an existing parent owned by the same owner", async () => {
    const parent = await service.createCategory({ ownerId, name: "Housing" });

    const child = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });

    expect(child.parentCategoryId).toBe(parent.id);
  });

  it("rejects a parent category that belongs to a different owner", async () => {
    const otherOwnersCategory = await categoryRepository.create({ ownerId: otherOwnerId, name: "Housing" });

    await expect(
      service.createCategory({ ownerId, name: "Rent", parentCategoryId: otherOwnersCategory.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a nonexistent parent category", async () => {
    await expect(
      service.createCategory({ ownerId, name: "Rent", parentCategoryId: randomUUID() }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletes a category with no children or transactions", async () => {
    const category = await service.createCategory({ ownerId, name: "Housing" });

    await service.deleteCategory(category.id, ownerId);

    await expect(service.getCategory(category.id, ownerId)).resolves.toBeNull();
  });

  it("blocks deleting a category that still has subcategories", async () => {
    const parent = await service.createCategory({ ownerId, name: "Housing" });
    await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });

    await expect(service.deleteCategory(parent.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
  });

  it("blocks deleting a category that transactions still reference", async () => {
    const category = await service.createCategory({ ownerId, name: "Groceries" });
    await transactionRepository.create({
      ownerId,
      accountId: randomUUID(),
      categoryId: category.id,
      transactionDate: "2026-07-05",
      originalDescription: "GROCERY STORE",
      amount: "-50.00",
      transactionType: "expense",
    });

    await expect(service.deleteCategory(category.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
  });
});
