import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";

import { DrizzleUserRepository } from "./users-repository";
import { createTestAuthUser } from "./test-support/create-test-auth-user";
import { createTestDbClient, isDbTestingAllowed } from "./test-support/test-db-client";
import { withRollback } from "./test-support/with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses.
const hasDatabase = isDbTestingAllowed();

describe.skipIf(!hasDatabase)("DrizzleUserRepository (integration)", () => {
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

  // Profile creation itself is exercised by the handle_new_user trigger
  // (see src/db/migrations/0002_handle_new_user_trigger.sql) as soon as
  // createTestAuthUser() inserts into auth.users — there is no longer a
  // production path where the repository's own create() independently
  // originates a profile. These tests instead target the partial unique
  // index on active emails directly via update(), which sidesteps
  // auth.users' own separate (non-partial) email-uniqueness constraint
  // entirely rather than fighting it.
  it("allows reusing an email on public.users after the original profile is soft-deleted", async () => {
    await withRollback(db, async (tx) => {
      const repository = new DrizzleUserRepository(tx);
      const authA = await createTestAuthUser(tx);
      const authB = await createTestAuthUser(tx);
      const sharedEmail = `shared-${authA.id}@example.com`;

      await repository.update(authA.id, { email: sharedEmail });
      await repository.softDelete(authA.id);

      const profileB = await repository.update(authB.id, { email: sharedEmail });

      expect(profileB.email).toBe(sharedEmail);
      expect(await repository.getById(authA.id)).toBeNull();
    });
  });

  it("rejects a duplicate email among active users", async () => {
    await expect(
      db.transaction(async (tx) => {
        const repository = new DrizzleUserRepository(tx);
        const authA = await createTestAuthUser(tx);
        const authB = await createTestAuthUser(tx);
        const sharedEmail = `shared-${authA.id}@example.com`;

        await repository.update(authA.id, { email: sharedEmail });
        await repository.update(authB.id, { email: sharedEmail });
      }),
    ).rejects.toThrow();
  });

  it("the profile-creation trigger populates id, email, and a display name from auth.users", async () => {
    await withRollback(db, async (tx) => {
      const repository = new DrizzleUserRepository(tx);
      const auth = await createTestAuthUser(tx, { email: "  Trigger.Test@Example.com  " });

      const profile = await repository.getById(auth.id);

      expect(profile).not.toBeNull();
      expect(profile?.email).toBe("trigger.test@example.com");
      expect(profile?.displayName.length).toBeGreaterThan(0);
    });
  });
});
