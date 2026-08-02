import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { categories } from "@/db/schema";
import { NotFoundError } from "@/domains/errors";

import { DrizzleCategoryRepository } from "./categories-repository";
import { createTestAuthUser } from "./test-support/create-test-auth-user";
import { withRollback } from "./test-support/with-rollback";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("DrizzleCategoryRepository (integration)", () => {
  let db: DbClient;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const client = await import("@/db/client");
    db = client.db;
    close = () => client.queryClient.end();
  });

  afterAll(async () => {
    await close();
  });

  it("does not return another owner's categories", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);

      // createTestAuthUser() alone is enough: the handle_new_user trigger
      // creates the matching public.users profile as soon as the
      // auth.users row exists.
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);

      await categoryRepository.create({ ownerId: ownerA.id, name: "Housing" });
      await categoryRepository.create({ ownerId: ownerB.id, name: "Housing" });

      const ownerACategories = await categoryRepository.listForOwner(ownerA.id);

      expect(ownerACategories).toHaveLength(1);
    });
  });

  it("prevents hard-deleting a parent category that still has a child (RESTRICT)", async () => {
    await expect(
      db.transaction(async (tx) => {
        const categoryRepository = new DrizzleCategoryRepository(tx);

        const owner = await createTestAuthUser(tx);
        const parent = await categoryRepository.create({ ownerId: owner.id, name: "Housing" });
        await categoryRepository.create({ ownerId: owner.id, name: "Rent", parentCategoryId: parent.id });

        // A genuine hard DELETE, bypassing the repository (which never does
        // this) specifically to prove the RESTRICT constraint still holds at
        // the database level even though the app never triggers it today.
        await tx.delete(categories).where(eq(categories.id, parent.id));
      }),
    ).rejects.toThrow();
  });

  it("creates and reads back a category by id for its owner", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);
      const owner = await createTestAuthUser(tx);

      const created = await categoryRepository.create({ ownerId: owner.id, name: "Housing" });
      const reloaded = await categoryRepository.getByIdForOwner(created.id, owner.id);

      expect(reloaded).toMatchObject({ id: created.id, name: "Housing", parentCategoryId: null });
    });
  });

  it("returns null when reading another owner's category by id", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);

      const category = await categoryRepository.create({ ownerId: ownerA.id, name: "Housing" });

      await expect(categoryRepository.getByIdForOwner(category.id, ownerB.id)).resolves.toBeNull();
    });
  });

  it("updates mutable fields without changing ownership", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);
      const owner = await createTestAuthUser(tx);
      const category = await categoryRepository.create({ ownerId: owner.id, name: "Housing" });

      const updated = await categoryRepository.update(category.id, owner.id, { name: "Home" });

      expect(updated.name).toBe("Home");
      expect(updated.ownerId).toBe(owner.id);
    });
  });

  it("throws NotFoundError updating another owner's category", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);
      const category = await categoryRepository.create({ ownerId: ownerA.id, name: "Housing" });

      await expect(categoryRepository.update(category.id, ownerB.id, { name: "Hijacked" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  it("soft-deletes a category so it no longer resolves, without a hard delete", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);
      const owner = await createTestAuthUser(tx);
      const category = await categoryRepository.create({ ownerId: owner.id, name: "Housing" });

      await categoryRepository.softDelete(category.id, owner.id);

      await expect(categoryRepository.getByIdForOwner(category.id, owner.id)).resolves.toBeNull();
      await expect(categoryRepository.listForOwner(owner.id)).resolves.toHaveLength(0);
      // Still a real row, not hard-deleted — direct query bypassing the
      // owner/deletedAt-scoped repository methods proves it.
      const [rawRow] = await tx.select().from(categories).where(eq(categories.id, category.id));
      expect(rawRow).toBeDefined();
      expect(rawRow.deletedAt).not.toBeNull();
    });
  });

  it("throws NotFoundError instead of silently no-oping when soft-deleting another owner's category", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);
      const category = await categoryRepository.create({ ownerId: ownerA.id, name: "Housing" });

      await expect(categoryRepository.softDelete(category.id, ownerB.id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(categoryRepository.getByIdForOwner(category.id, ownerA.id)).resolves.not.toBeNull();
    });
  });

  it("throws NotFoundError soft-deleting an already soft-deleted category", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);
      const owner = await createTestAuthUser(tx);
      const category = await categoryRepository.create({ ownerId: owner.id, name: "Housing" });
      await categoryRepository.softDelete(category.id, owner.id);

      await expect(categoryRepository.softDelete(category.id, owner.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it("lists only children belonging to the given owner", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);
      const owner = await createTestAuthUser(tx);
      const parent = await categoryRepository.create({ ownerId: owner.id, name: "Housing" });
      await categoryRepository.create({ ownerId: owner.id, name: "Rent", parentCategoryId: parent.id });

      const children = await categoryRepository.listChildren(parent.id, owner.id);

      expect(children).toHaveLength(1);
      expect(children[0].name).toBe("Rent");
    });
  });
});
