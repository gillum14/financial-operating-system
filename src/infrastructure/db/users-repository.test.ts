import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";

import { DrizzleUserRepository } from "./users-repository";
import { withRollback } from "./test-support/with-rollback";

// Requires a real DATABASE_URL — skipped entirely (import of @/db/client is
// deferred until here) when one isn't set, so a missing database doesn't
// break the rest of the test run.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("DrizzleUserRepository (integration)", () => {
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

  it("allows reusing an email after the original user is soft-deleted", async () => {
    await withRollback(db, async (tx) => {
      const repository = new DrizzleUserRepository(tx);
      const email = `test-${randomUUID()}@example.com`;

      const first = await repository.create({ email, displayName: "First" });
      await repository.softDelete(first.id);

      const second = await repository.create({ email, displayName: "Second" });

      expect(second.id).not.toBe(first.id);
      expect(second.email).toBe(email);
    });
  });

  it("rejects a duplicate email among active users", async () => {
    await expect(
      db.transaction(async (tx) => {
        const repository = new DrizzleUserRepository(tx);
        const email = `test-${randomUUID()}@example.com`;

        await repository.create({ email, displayName: "First" });
        await repository.create({ email, displayName: "Second" });
      }),
    ).rejects.toThrow();
  });
});
