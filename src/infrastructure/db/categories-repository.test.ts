import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { categories } from "@/db/schema";
import { NotFoundError } from "@/domains/errors";

import { DrizzleCategoryRepository } from "./categories-repository";
import { createTestAuthUser } from "./test-support/create-test-auth-user";
import { createTestDbClient, isDbTestingAllowed } from "./test-support/test-db-client";
import { withRollback } from "./test-support/with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

describe.skipIf(!hasDatabase)("DrizzleCategoryRepository (integration)", () => {
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

  it("persists color and description through create and update", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);
      const owner = await createTestAuthUser(tx);

      const created = await categoryRepository.create({
        ownerId: owner.id,
        name: "Housing",
        color: "#3b82f6",
        description: "Rent, mortgage, and home upkeep",
      });
      expect(created.color).toBe("#3b82f6");
      expect(created.description).toBe("Rent, mortgage, and home upkeep");

      const updated = await categoryRepository.update(created.id, owner.id, { color: "#22c55e" });
      expect(updated.color).toBe("#22c55e");
      // Untouched field survives a partial update.
      expect(updated.description).toBe("Rent, mortgage, and home upkeep");
    });
  });

  it("listForOwner and listChildren order by sortOrder, ascending", async () => {
    await withRollback(db, async (tx) => {
      const categoryRepository = new DrizzleCategoryRepository(tx);
      const owner = await createTestAuthUser(tx);

      const first = await categoryRepository.create({ ownerId: owner.id, name: "Housing", sortOrder: 2 });
      const second = await categoryRepository.create({ ownerId: owner.id, name: "Transportation", sortOrder: 0 });
      const third = await categoryRepository.create({ ownerId: owner.id, name: "Utilities", sortOrder: 1 });

      const topLevel = await categoryRepository.listForOwner(owner.id);

      expect(topLevel.map((row) => row.id)).toEqual([second.id, third.id, first.id]);

      const parent = await categoryRepository.create({ ownerId: owner.id, name: "Food", sortOrder: 3 });
      const laterChild = await categoryRepository.create({
        ownerId: owner.id,
        name: "Restaurants",
        parentCategoryId: parent.id,
        sortOrder: 1,
      });
      const earlierChild = await categoryRepository.create({
        ownerId: owner.id,
        name: "Groceries",
        parentCategoryId: parent.id,
        sortOrder: 0,
      });

      const children = await categoryRepository.listChildren(parent.id, owner.id);
      expect(children.map((row) => row.id)).toEqual([earlierChild.id, laterChild.id]);
    });
  });

  describe("reorder", () => {
    it("sets sortOrder to the position of each id in the given order, atomically", async () => {
      await withRollback(db, async (tx) => {
        const categoryRepository = new DrizzleCategoryRepository(tx);
        const owner = await createTestAuthUser(tx);

        const first = await categoryRepository.create({ ownerId: owner.id, name: "Housing" });
        const second = await categoryRepository.create({ ownerId: owner.id, name: "Transportation" });
        const third = await categoryRepository.create({ ownerId: owner.id, name: "Utilities" });

        const reordered = await categoryRepository.reorder(owner.id, [third.id, first.id, second.id]);

        expect(reordered.map((row) => ({ id: row.id, sortOrder: row.sortOrder }))).toEqual([
          { id: third.id, sortOrder: 0 },
          { id: first.id, sortOrder: 1 },
          { id: second.id, sortOrder: 2 },
        ]);

        const persisted = await categoryRepository.listForOwner(owner.id);
        expect(persisted.map((row) => row.id)).toEqual([third.id, first.id, second.id]);
      });
    });

    it("throws NotFoundError and applies nothing when one id belongs to another owner", async () => {
      await withRollback(db, async (tx) => {
        const categoryRepository = new DrizzleCategoryRepository(tx);
        const ownerA = await createTestAuthUser(tx);
        const ownerB = await createTestAuthUser(tx);

        // sortOrder: 9 is deliberately far from 0 — reorder() would set it
        // to 0 (its index in the list below) if the first iteration's
        // write actually stuck, so seeing it survive as 9 (not silently
        // changed to 0) is what proves the transaction rolled back rather
        // than partially applying before the second id failed.
        const ownedByA = await categoryRepository.create({ ownerId: ownerA.id, name: "Housing", sortOrder: 9 });
        const ownedByB = await categoryRepository.create({ ownerId: ownerB.id, name: "Someone else's" });

        await expect(categoryRepository.reorder(ownerA.id, [ownedByA.id, ownedByB.id])).rejects.toBeInstanceOf(
          NotFoundError,
        );

        const reloaded = await categoryRepository.getByIdForOwner(ownedByA.id, ownerA.id);
        expect(reloaded?.sortOrder).toBe(9);
      });
    });
  });
});
