import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryService } from "@/application/categories/service";
import { FakeCategoryRepository, FakeTransactionRepository } from "@/application/test-support/repository-fakes";

import { createCategory, deleteCategory, getCategory, listActiveCategories, updateCategory } from "./actions";

// vi.mock factories are hoisted above every other top-level statement, so
// anything they reference must come from vi.hoisted() rather than a plain
// const/let — see src/features/accounts/actions.test.ts for the same
// pattern and the TDZ pitfall it avoids.
const mockGetAuthenticatedUser = vi.hoisted(() => vi.fn());
const repos = vi.hoisted(() => ({
  categoryRepository: undefined as unknown as FakeCategoryRepository,
  transactionRepository: undefined as unknown as FakeTransactionRepository,
}));

vi.mock("@/lib/auth/authenticated-user", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/composition/categories-composition", () => ({
  getCategoryService: () => new CategoryService(repos.categoryRepository, repos.transactionRepository),
}));

function signInAs(userId: string) {
  mockGetAuthenticatedUser.mockResolvedValue({ id: userId, email: "person@example.com", emailConfirmedAt: null });
}

describe("Categories Server Actions", () => {
  const ownerId = randomUUID();

  beforeEach(() => {
    mockGetAuthenticatedUser.mockReset();
    repos.categoryRepository = new FakeCategoryRepository();
    repos.transactionRepository = new FakeTransactionRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authentication", () => {
    it("createCategory fails with authentication category when unauthenticated", async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const result = await createCategory({ name: "Housing" });

      expect(result).toMatchObject({ success: false, error: { category: "authentication" } });
    });

    it("listActiveCategories fails with authentication category when unauthenticated", async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const result = await listActiveCategories();

      expect(result).toMatchObject({ success: false, error: { category: "authentication" } });
    });

    it("getCategory, updateCategory, and deleteCategory fail with authentication category when unauthenticated", async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      await expect(getCategory({ categoryId: randomUUID() })).resolves.toMatchObject({
        success: false,
        error: { category: "authentication" },
      });
      await expect(updateCategory({ categoryId: randomUUID(), name: "Renamed" })).resolves.toMatchObject({
        success: false,
        error: { category: "authentication" },
      });
      await expect(deleteCategory({ categoryId: randomUUID() })).resolves.toMatchObject({
        success: false,
        error: { category: "authentication" },
      });
    });
  });

  describe("validation", () => {
    it("createCategory fails with validation category and field errors on a missing name", async () => {
      signInAs(ownerId);

      const result = await createCategory({});

      expect(result.success).toBe(false);
      if (result.success) throw new Error("expected failure");
      expect(result.error.category).toBe("validation");
      expect(result.error.fieldErrors?.name).toBeTruthy();
    });

    it("getCategory fails with validation category on a malformed categoryId", async () => {
      signInAs(ownerId);

      const result = await getCategory({ categoryId: "not-a-uuid" });

      expect(result).toMatchObject({ success: false, error: { category: "validation" } });
    });

    it("updateCategory fails with validation category on an empty name", async () => {
      signInAs(ownerId);
      const created = await createCategory({ name: "Housing" });
      if (!created.success) throw new Error("setup failed");

      const result = await updateCategory({ categoryId: created.data.id, name: "" });

      expect(result).toMatchObject({ success: false, error: { category: "validation" } });
    });

    it("updateCategory fails with validation category when a category references itself as parent", async () => {
      signInAs(ownerId);
      const created = await createCategory({ name: "Housing" });
      if (!created.success) throw new Error("setup failed");

      const result = await updateCategory({ categoryId: created.data.id, parentCategoryId: created.data.id });

      expect(result).toMatchObject({ success: false, error: { category: "validation" } });
    });
  });

  describe("successful execution", () => {
    it("creates a category, deriving ownerId from the session and ignoring any client-supplied ownerId", async () => {
      signInAs(ownerId);

      const result = await createCategory({ name: "Housing", ownerId: "attacker-controlled-id" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("expected success");
      expect(result.data.ownerId).toBe(ownerId);
      expect(result.data.ownerId).not.toBe("attacker-controlled-id");
      expect(result.data.parentCategoryId).toBeNull();
    });

    it("creates a direct subcategory under an owned top-level category", async () => {
      signInAs(ownerId);
      const parent = await createCategory({ name: "Housing" });
      if (!parent.success) throw new Error("setup failed");

      const result = await createCategory({ name: "Rent", parentCategoryId: parent.data.id });

      expect(result).toMatchObject({ success: true, data: { parentCategoryId: parent.data.id } });
    });

    it("updates mutable fields on an owned category", async () => {
      signInAs(ownerId);
      const created = await createCategory({ name: "Housing" });
      if (!created.success) throw new Error("setup failed");

      const result = await updateCategory({ categoryId: created.data.id, name: "Home" });

      expect(result).toMatchObject({ success: true, data: { name: "Home", ownerId } });
    });

    it("soft-deletes a category with no children or transactions", async () => {
      signInAs(ownerId);
      const created = await createCategory({ name: "Housing" });
      if (!created.success) throw new Error("setup failed");

      const result = await deleteCategory({ categoryId: created.data.id });

      expect(result).toMatchObject({ success: true });
      await expect(getCategory({ categoryId: created.data.id })).resolves.toMatchObject({
        success: false,
        error: { category: "domain" },
      });
      await expect(listActiveCategories()).resolves.toMatchObject({ success: true, data: [] });
    });

    it("getCategory returns an owned category", async () => {
      signInAs(ownerId);
      const created = await createCategory({ name: "Housing" });
      if (!created.success) throw new Error("setup failed");

      const result = await getCategory({ categoryId: created.data.id });

      expect(result).toMatchObject({ success: true, data: { id: created.data.id } });
    });
  });

  describe("hierarchy rules", () => {
    it("rejects creating a category under a category that is already a subcategory", async () => {
      signInAs(ownerId);
      const grandparent = await createCategory({ name: "Housing" });
      if (!grandparent.success) throw new Error("setup failed");
      const parent = await createCategory({ name: "Rent", parentCategoryId: grandparent.data.id });
      if (!parent.success) throw new Error("setup failed");

      const result = await createCategory({ name: "Late Fee", parentCategoryId: parent.data.id });

      expect(result).toMatchObject({ success: false, error: { category: "domain" } });
    });

    it("rejects soft-deleting a category that still has an active subcategory", async () => {
      signInAs(ownerId);
      const parent = await createCategory({ name: "Housing" });
      if (!parent.success) throw new Error("setup failed");
      const child = await createCategory({ name: "Rent", parentCategoryId: parent.data.id });
      if (!child.success) throw new Error("setup failed");

      const result = await deleteCategory({ categoryId: parent.data.id });

      expect(result).toMatchObject({ success: false, error: { category: "domain" } });
    });
  });

  // Cross-owner access — including using another owner's category as a
  // parent — is denied the same way an absent resource would be, never
  // confirming existence. See src/features/accounts/actions.test.ts for
  // the same convention applied to Accounts.
  describe("authorization (cross-owner access)", () => {
    it("getCategory and updateCategory deny access to another owner's category", async () => {
      signInAs(ownerId);
      const created = await createCategory({ name: "Housing" });
      if (!created.success) throw new Error("setup failed");

      signInAs(randomUUID());

      await expect(getCategory({ categoryId: created.data.id })).resolves.toMatchObject({
        success: false,
        error: { category: "domain" },
      });
      await expect(updateCategory({ categoryId: created.data.id, name: "Hijacked" })).resolves.toMatchObject({
        success: false,
        error: { category: "domain" },
      });
    });

    it("deleteCategory denies deleting another owner's category", async () => {
      signInAs(ownerId);
      const created = await createCategory({ name: "Housing" });
      if (!created.success) throw new Error("setup failed");

      signInAs(randomUUID());
      const result = await deleteCategory({ categoryId: created.data.id });

      expect(result).toMatchObject({ success: false, error: { category: "domain" } });
    });

    it("createCategory rejects a spoofed parentCategoryId belonging to another owner without confirming it exists", async () => {
      signInAs(ownerId);
      const foreign = await createCategory({ name: "Housing" });
      if (!foreign.success) throw new Error("setup failed");

      signInAs(randomUUID());
      const result = await createCategory({ name: "Rent", parentCategoryId: foreign.data.id });

      expect(result).toMatchObject({ success: false, error: { category: "domain" } });
    });
  });

  describe("generic error responses", () => {
    it("never leaks a raw infrastructure error from a failed create", async () => {
      signInAs(ownerId);
      const dbError = new Error("duplicate key value violates unique constraint (owner_id)=(secret) already exists");
      dbError.name = "DrizzleQueryError";
      vi.spyOn(repos.categoryRepository, "create").mockRejectedValueOnce(dbError);

      const result = await createCategory({ name: "Housing" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("expected failure");
      expect(result.error.category).toBe("infrastructure");
      expect(result.error.message).toBe("This action could not be completed right now. Please try again.");
      expect(JSON.stringify(result.error)).not.toContain("secret");
    });

    it("never leaks a raw unexpected error from a failed list", async () => {
      signInAs(ownerId);
      vi.spyOn(repos.categoryRepository, "listForOwner").mockRejectedValueOnce(
        new TypeError("Cannot read properties of undefined (reading 'rows')"),
      );

      const result = await listActiveCategories();

      expect(result).toMatchObject({
        success: false,
        error: { category: "unexpected", message: "Something went wrong. Please try again." },
      });
    });
  });
});
