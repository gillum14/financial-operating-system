import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { categories } from "@/db/schema";

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
});
