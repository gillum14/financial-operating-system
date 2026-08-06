import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { accounts as accountsTable, institutions } from "@/db/schema";
import { NotFoundError } from "@/domains/errors";

import { DrizzleAccountRepository } from "./accounts-repository";
import { DrizzleInstitutionRepository } from "./institutions-repository";
import { createTestAuthUser } from "./test-support/create-test-auth-user";
import { createTestDbClient, isDbTestingAllowed } from "./test-support/test-db-client";
import { withRollback } from "./test-support/with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

describe.skipIf(!hasDatabase)("DrizzleAccountRepository (integration)", () => {
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

  it("does not return another owner's accounts", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);

      // createTestAuthUser() alone is enough: the handle_new_user trigger
      // (src/db/migrations/0002_handle_new_user_trigger.sql) creates the
      // matching public.users profile as soon as the auth.users row exists.
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);

      await accounts.create({ ownerId: ownerA.id, name: "A's Checking", accountType: "checking" });
      await accounts.create({ ownerId: ownerB.id, name: "B's Checking", accountType: "checking" });

      const ownerAAccounts = await accounts.listForOwner(ownerA.id);

      expect(ownerAAccounts).toHaveLength(1);
      expect(ownerAAccounts[0].name).toBe("A's Checking");
    });
  });

  it("sets institutionId to null when the referenced institution is hard-deleted", async () => {
    await withRollback(db, async (tx) => {
      const institutionRepository = new DrizzleInstitutionRepository(tx);
      const accounts = new DrizzleAccountRepository(tx);

      const owner = await createTestAuthUser(tx);
      const institution = await institutionRepository.create({ name: "Test Bank" });
      const account = await accounts.create({
        ownerId: owner.id,
        institutionId: institution.id,
        name: "Checking",
        accountType: "checking",
      });

      // Hard-delete directly — the repository layer only ever soft-deletes,
      // so this is the only way to exercise ON DELETE SET NULL for real.
      await tx.delete(institutions).where(eq(institutions.id, institution.id));

      const reloaded = await accounts.getByIdForOwner(account.id, owner.id);

      expect(reloaded?.institutionId).toBeNull();
    });
  });

  it("creates and reads back an account by id for its owner", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const owner = await createTestAuthUser(tx);

      const created = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });
      const reloaded = await accounts.getByIdForOwner(created.id, owner.id);

      expect(reloaded).toMatchObject({ id: created.id, name: "Checking", status: "active" });
    });
  });

  it("returns null when reading another owner's account by id", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);

      const account = await accounts.create({ ownerId: ownerA.id, name: "A's Checking", accountType: "checking" });

      await expect(accounts.getByIdForOwner(account.id, ownerB.id)).resolves.toBeNull();
    });
  });

  it("updates mutable fields without changing ownership", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const owner = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });

      const updated = await accounts.update(account.id, owner.id, { name: "Everyday Checking" });

      expect(updated.name).toBe("Everyday Checking");
      expect(updated.ownerId).toBe(owner.id);
    });
  });

  it("throws NotFoundError updating another owner's account", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: ownerA.id, name: "A's Checking", accountType: "checking" });

      await expect(accounts.update(account.id, ownerB.id, { name: "Hijacked" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  it("archives and restores an account, filtering listForOwner by status", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const owner = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: owner.id, name: "Old Card", accountType: "credit-card" });

      const archived = await accounts.archive(account.id, owner.id);
      expect(archived.status).toBe("archived");
      await expect(accounts.listForOwner(owner.id, "active")).resolves.toHaveLength(0);
      await expect(accounts.listForOwner(owner.id, "archived")).resolves.toHaveLength(1);
      await expect(accounts.listForOwner(owner.id)).resolves.toHaveLength(1);

      const restored = await accounts.restore(account.id, owner.id);
      expect(restored.status).toBe("active");
      await expect(accounts.listForOwner(owner.id, "active")).resolves.toHaveLength(1);
      await expect(accounts.listForOwner(owner.id, "archived")).resolves.toHaveLength(0);
    });
  });

  it("throws NotFoundError archiving or restoring another owner's account", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const ownerA = await createTestAuthUser(tx);
      const ownerB = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: ownerA.id, name: "A's Checking", accountType: "checking" });

      await expect(accounts.archive(account.id, ownerB.id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(accounts.restore(account.id, ownerB.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it("excludes a soft-deleted account from a status-filtered list", async () => {
    await withRollback(db, async (tx) => {
      const accounts = new DrizzleAccountRepository(tx);
      const owner = await createTestAuthUser(tx);
      const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });

      await accounts.softDelete(account.id, owner.id);

      await expect(accounts.listForOwner(owner.id, "active")).resolves.toHaveLength(0);
      await expect(accounts.getByIdForOwner(account.id, owner.id)).resolves.toBeNull();
    });
  });

  // Regression coverage for the softDelete false-success bug: an
  // unconditional UPDATE ... WHERE id = ? AND owner_id = ? matched zero
  // rows on a cross-owner or nonexistent id and returned success anyway.
  // Mirrors the same fix and test shape already applied to
  // DrizzleCategoryRepository.softDelete (see categories-repository.test.ts).
  describe("softDelete verification", () => {
    it("allows the owner to soft-delete their own account", async () => {
      await withRollback(db, async (tx) => {
        const accounts = new DrizzleAccountRepository(tx);
        const owner = await createTestAuthUser(tx);
        const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });

        await expect(accounts.softDelete(account.id, owner.id)).resolves.toBeUndefined();
      });
    });

    it("throws NotFoundError instead of silently no-oping on a cross-owner soft-delete", async () => {
      await withRollback(db, async (tx) => {
        const accounts = new DrizzleAccountRepository(tx);
        const ownerA = await createTestAuthUser(tx);
        const ownerB = await createTestAuthUser(tx);
        const account = await accounts.create({ ownerId: ownerA.id, name: "A's Checking", accountType: "checking" });

        await expect(accounts.softDelete(account.id, ownerB.id)).rejects.toBeInstanceOf(NotFoundError);
        // The cross-owner attempt must not have mutated anything.
        await expect(accounts.getByIdForOwner(account.id, ownerA.id)).resolves.not.toBeNull();
      });
    });

    it("throws NotFoundError soft-deleting a nonexistent account", async () => {
      await withRollback(db, async (tx) => {
        const accounts = new DrizzleAccountRepository(tx);
        const owner = await createTestAuthUser(tx);

        await expect(accounts.softDelete(randomUUID(), owner.id)).rejects.toBeInstanceOf(NotFoundError);
      });
    });

    it("throws NotFoundError soft-deleting an already soft-deleted account", async () => {
      await withRollback(db, async (tx) => {
        const accounts = new DrizzleAccountRepository(tx);
        const owner = await createTestAuthUser(tx);
        const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });
        await accounts.softDelete(account.id, owner.id);

        await expect(accounts.softDelete(account.id, owner.id)).rejects.toBeInstanceOf(NotFoundError);
      });
    });

    it("sets deletedAt to a real timestamp on a successful soft-delete, leaving it null before", async () => {
      await withRollback(db, async (tx) => {
        const accounts = new DrizzleAccountRepository(tx);
        const owner = await createTestAuthUser(tx);
        const account = await accounts.create({ ownerId: owner.id, name: "Checking", accountType: "checking" });
        expect(account.deletedAt).toBeNull();

        await accounts.softDelete(account.id, owner.id);

        // getByIdForOwner filters deletedAt IS NULL, so a direct row read
        // (bypassing the repository) is the only way to see the value.
        const [rawRow] = await tx.select().from(accountsTable).where(eq(accountsTable.id, account.id));
        expect(rawRow).toBeDefined();
        expect(rawRow.deletedAt).not.toBeNull();
        expect(rawRow.deletedAt).toBeInstanceOf(Date);
      });
    });
  });
});
