import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";
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

  it("updates a category's mutable fields", async () => {
    const category = await service.createCategory({ ownerId, name: "Housing" });

    const updated = await service.updateCategory(category.id, ownerId, { name: "Home" });

    expect(updated.name).toBe("Home");
    expect(updated.ownerId).toBe(ownerId);
  });

  it("throws NotFoundError updating another owner's category", async () => {
    const category = await service.createCategory({ ownerId, name: "Housing" });

    await expect(service.updateCategory(category.id, otherOwnerId, { name: "Hijacked" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  describe("two-level hierarchy limit", () => {
    it("rejects creating a category under a category that is already a subcategory", async () => {
      const grandparent = await service.createCategory({ ownerId, name: "Housing" });
      const parent = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: grandparent.id });

      await expect(
        service.createCategory({ ownerId, name: "Late Fee", parentCategoryId: parent.id }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects moving a category to become a child of a subcategory via update", async () => {
      const grandparent = await service.createCategory({ ownerId, name: "Housing" });
      const parent = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: grandparent.id });
      const topLevel = await service.createCategory({ ownerId, name: "Utilities" });

      await expect(
        service.updateCategory(topLevel.id, ownerId, { parentCategoryId: parent.id }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("allows creating a direct subcategory under a top-level category", async () => {
      const parent = await service.createCategory({ ownerId, name: "Housing" });

      const child = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });

      expect(child.parentCategoryId).toBe(parent.id);
    });
  });

  describe("self-reference", () => {
    it("rejects a category referencing itself as parent via update", async () => {
      const category = await service.createCategory({ ownerId, name: "Housing" });

      await expect(
        service.updateCategory(category.id, ownerId, { parentCategoryId: category.id }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("cross-owner parent references", () => {
    it("does not reveal whether a foreign category exists — same NotFoundError as a nonexistent id", async () => {
      const otherOwnersCategory = await categoryRepository.create({ ownerId: otherOwnerId, name: "Housing" });

      const foreignError = await service
        .createCategory({ ownerId, name: "Rent", parentCategoryId: otherOwnersCategory.id })
        .catch((error: unknown) => error);
      const missingError = await service
        .createCategory({ ownerId, name: "Rent", parentCategoryId: randomUUID() })
        .catch((error: unknown) => error);

      expect(foreignError).toBeInstanceOf(NotFoundError);
      expect(missingError).toBeInstanceOf(NotFoundError);
      expect((foreignError as NotFoundError).message).not.toMatch(/other|foreign|different owner/i);
    });
  });
});
