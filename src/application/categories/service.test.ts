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

  describe("sortOrder", () => {
    it("appends new top-level categories to the end of the owner's top-level order", async () => {
      const first = await service.createCategory({ ownerId, name: "Housing" });
      const second = await service.createCategory({ ownerId, name: "Transportation" });
      const third = await service.createCategory({ ownerId, name: "Utilities" });

      expect(first.sortOrder).toBe(0);
      expect(second.sortOrder).toBe(1);
      expect(third.sortOrder).toBe(2);
    });

    it("appends new subcategories to the end of their own parent's order, independent of top-level order", async () => {
      const parent = await service.createCategory({ ownerId, name: "Housing" });
      await service.createCategory({ ownerId, name: "Transportation" });

      const firstChild = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });
      const secondChild = await service.createCategory({ ownerId, name: "Utilities Bill", parentCategoryId: parent.id });

      expect(firstChild.sortOrder).toBe(0);
      expect(secondChild.sortOrder).toBe(1);
    });

    // Regression test: a promotion out of a group used to leave a gap
    // (the sibling left behind keeps its old sortOrder, never renumbered),
    // and "append to end" was computed as `siblings.length` — which is
    // exactly the value the gap left behind, producing a real collision.
    // Found live: Housing had children Rent(0), Insurance(1); Rent was
    // promoted to top-level, leaving only Insurance(1); a newly created
    // "Home Repairs" then also got sortOrder 1 via the old
    // `siblings.length` (1 sibling remaining) logic.
    it("does not collide with an existing sortOrder when a sibling group has a gap from an earlier promotion", async () => {
      const parent = await service.createCategory({ ownerId, name: "Housing" });
      const first = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });
      const second = await service.createCategory({ ownerId, name: "Insurance", parentCategoryId: parent.id });
      expect(first.sortOrder).toBe(0);
      expect(second.sortOrder).toBe(1);

      // Promote "Rent" back to top-level — Housing's children group now
      // has just "Insurance" at sortOrder 1, a gap where 0 used to be.
      await service.updateCategory(first.id, ownerId, { parentCategoryId: null });

      const third = await service.createCategory({ ownerId, name: "Home Repairs", parentCategoryId: parent.id });

      expect(third.sortOrder).not.toBe(second.sortOrder);
      expect(third.sortOrder).toBeGreaterThan(second.sortOrder);
    });

    it("appends a category moved into a new sibling group to the end of that group, not its old position", async () => {
      const parentA = await service.createCategory({ ownerId, name: "Housing" });
      const parentB = await service.createCategory({ ownerId, name: "Food" });
      await service.createCategory({ ownerId, name: "Groceries", parentCategoryId: parentB.id });
      const moving = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parentA.id });

      const moved = await service.updateCategory(moving.id, ownerId, { parentCategoryId: parentB.id });

      expect(moved.parentCategoryId).toBe(parentB.id);
      expect(moved.sortOrder).toBe(1);
    });
  });

  describe("moving a subcategory back to top-level", () => {
    it("clears parentCategoryId when explicitly set to null and appends to the top-level order", async () => {
      const parent = await service.createCategory({ ownerId, name: "Housing" });
      await service.createCategory({ ownerId, name: "Transportation" });
      const child = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });

      const moved = await service.updateCategory(child.id, ownerId, { parentCategoryId: null });

      expect(moved.parentCategoryId).toBeNull();
      expect(moved.sortOrder).toBe(2);
    });

    it("leaves parentCategoryId untouched when the field is omitted entirely", async () => {
      const parent = await service.createCategory({ ownerId, name: "Housing" });
      const child = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });

      const updated = await service.updateCategory(child.id, ownerId, { name: "Rent Payment" });

      expect(updated.parentCategoryId).toBe(parent.id);
    });
  });

  describe("moving a category that already has its own subcategories", () => {
    it("rejects nesting a category with children under another category", async () => {
      const parent = await service.createCategory({ ownerId, name: "Housing" });
      await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });
      const otherTopLevel = await service.createCategory({ ownerId, name: "Food" });

      await expect(
        service.updateCategory(parent.id, ownerId, { parentCategoryId: otherTopLevel.id }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("still allows moving that same category back to top-level (a no-op re: depth)", async () => {
      const parent = await service.createCategory({ ownerId, name: "Housing" });
      await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });

      // Already top-level, so this doesn't change parentCategoryId at all —
      // proves the "has children" guard only fires when actually attaching
      // under something, never for a category that's already top-level.
      const updated = await service.updateCategory(parent.id, ownerId, { parentCategoryId: null });

      expect(updated.parentCategoryId).toBeNull();
    });
  });

  describe("reorderCategories", () => {
    it("persists a new top-level order", async () => {
      const first = await service.createCategory({ ownerId, name: "Housing" });
      const second = await service.createCategory({ ownerId, name: "Transportation" });
      const third = await service.createCategory({ ownerId, name: "Utilities" });

      const reordered = await service.reorderCategories(ownerId, null, [third.id, first.id, second.id]);

      expect(reordered.map((row) => row.id)).toEqual([third.id, first.id, second.id]);
      expect(reordered.map((row) => row.sortOrder)).toEqual([0, 1, 2]);

      const persisted = await service.listCategories(ownerId);
      expect(persisted.map((row) => row.id)).toEqual([third.id, first.id, second.id]);
    });

    it("persists a new subcategory order scoped to one parent", async () => {
      const parent = await service.createCategory({ ownerId, name: "Housing" });
      const rent = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });
      const insurance = await service.createCategory({ ownerId, name: "Insurance", parentCategoryId: parent.id });

      const reordered = await service.reorderCategories(ownerId, parent.id, [insurance.id, rent.id]);

      expect(reordered.map((row) => row.id)).toEqual([insurance.id, rent.id]);
    });

    it("rejects a reorder list missing one of the current siblings", async () => {
      const first = await service.createCategory({ ownerId, name: "Housing" });
      await service.createCategory({ ownerId, name: "Transportation" });

      await expect(service.reorderCategories(ownerId, null, [first.id])).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects a reorder list containing a foreign category", async () => {
      const first = await service.createCategory({ ownerId, name: "Housing" });
      const foreign = await categoryRepository.create({ ownerId: otherOwnerId, name: "Someone else's" });

      await expect(service.reorderCategories(ownerId, null, [first.id, foreign.id])).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it("rejects a reorder list with duplicate ids", async () => {
      const first = await service.createCategory({ ownerId, name: "Housing" });

      await expect(service.reorderCategories(ownerId, null, [first.id, first.id])).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it("rejects a reorder list mixing in a category from a different sibling group", async () => {
      const parent = await service.createCategory({ ownerId, name: "Housing" });
      const child = await service.createCategory({ ownerId, name: "Rent", parentCategoryId: parent.id });
      const unrelatedTopLevel = await service.createCategory({ ownerId, name: "Food" });

      await expect(
        service.reorderCategories(ownerId, parent.id, [child.id, unrelatedTopLevel.id]),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });
});
