import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { institutions } from "@/db/schema";

import { DrizzleAccountRepository } from "./accounts-repository";
import { DrizzleInstitutionRepository } from "./institutions-repository";
import { withRollback } from "./test-support/with-rollback";
import { DrizzleUserRepository } from "./users-repository";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("DrizzleAccountRepository (integration)", () => {
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

  it("does not return another owner's accounts", async () => {
    await withRollback(db, async (tx) => {
      const users = new DrizzleUserRepository(tx);
      const accounts = new DrizzleAccountRepository(tx);

      const ownerA = await users.create({ email: `a-${randomUUID()}@example.com`, displayName: "Owner A" });
      const ownerB = await users.create({ email: `b-${randomUUID()}@example.com`, displayName: "Owner B" });

      await accounts.create({ ownerId: ownerA.id, name: "A's Checking", accountType: "checking" });
      await accounts.create({ ownerId: ownerB.id, name: "B's Checking", accountType: "checking" });

      const ownerAAccounts = await accounts.listForOwner(ownerA.id);

      expect(ownerAAccounts).toHaveLength(1);
      expect(ownerAAccounts[0].name).toBe("A's Checking");
    });
  });

  it("sets institutionId to null when the referenced institution is hard-deleted", async () => {
    await withRollback(db, async (tx) => {
      const users = new DrizzleUserRepository(tx);
      const institutionRepository = new DrizzleInstitutionRepository(tx);
      const accounts = new DrizzleAccountRepository(tx);

      const owner = await users.create({ email: `owner-${randomUUID()}@example.com`, displayName: "Owner" });
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
});
