import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DbClient } from "@/db/client";
import { accounts, categories, dataProviderConnections, institutions, transactions, users } from "@/db/schema";

import { runAsAuthenticatedUser } from "./test-support/run-as-authenticated-user";
import { createTestDbClient, isDbTestingAllowed } from "./test-support/test-db-client";
import { withRollback } from "./test-support/with-rollback";

// See db-test-guard.ts — requires ALLOW_DB_TESTS=true and a separate
// TEST_DATABASE_URL, never DATABASE_URL. Skipped entirely (and no real
// connection opened) when the guard refuses. Also requires the two fixed
// RLS test identities to already exist in auth.users (see .env.local /
// README's "RLS test users" setup) — they are NOT created or torn down by
// this file; they're a persistent, non-production fixture on the dev
// project.
const hasDatabase = isDbTestingAllowed();
const USER_A_ID = "10000000-0000-4000-8000-00000000000a";
const USER_B_ID = "10000000-0000-4000-8000-00000000000b";

// Verified against the live database (see Slice report) — Postgres RLS has
// three distinct failure shapes, asserted precisely below rather than
// guessed:
//   1. No GRANT at all for the operation -> throws "permission denied".
//   2. GRANT exists, USING excludes the row -> silent 0 rows, no error.
//   3. GRANT exists, USING matches, but the resulting row fails WITH CHECK
//      (e.g. an ownership reassignment) -> throws "violates row-level
//      security policy". INSERT has no USING concept, so a WITH CHECK
//      failure on INSERT always throws (case 3), never case 2.
//
// Drizzle wraps the real Postgres error in a DrizzleQueryError whose own
// .message is just "Failed query: ...\nparams: ..." — the actual denial
// reason is on .cause (a PostgresError). This unwraps it so assertions can
// check *which* failure mode occurred, not just that something failed.
async function expectDenied(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  const cause = (caught as { cause?: unknown }).cause;
  const message = cause instanceof Error ? cause.message : (caught as Error).message;
  expect(message).toMatch(pattern);
}

describe.skipIf(!hasDatabase)("Row Level Security policies (integration)", () => {
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

  describe("public.users", () => {
    it("User A can read own profile", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.select().from(users).where(eq(users.id, USER_A_ID));
        expect(rows).toHaveLength(1);
      });
    });

    it("User A cannot read User B's profile", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.select().from(users).where(eq(users.id, USER_B_ID));
        expect(rows).toHaveLength(0);
      });
    });

    it("an unfiltered select only ever returns the caller's own row", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.select({ id: users.id }).from(users);
        expect(rows.map((r) => r.id)).toEqual([USER_A_ID]);
      });
    });

    it("User A cannot insert an arbitrary profile (no INSERT grant at all)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(users).values({ id: randomUUID(), email: "hacker@example.com", displayName: "Hacker" });
        }),
        /permission denied/,
      );
    });

    it("User A cannot delete their profile (no DELETE grant at all)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(users).where(eq(users.id, USER_A_ID));
        }),
        /permission denied/,
      );
    });

    it("User A cannot change their profile id (no UPDATE grant on that column)", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(users).set({ id: randomUUID() }).where(eq(users.id, USER_A_ID));
        }),
        /permission denied/,
      );
    });

    it("User A can update their own display name", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .update(users)
          .set({ displayName: "Updated By RLS Test" })
          .where(eq(users.id, USER_A_ID))
          .returning();
        expect(row.displayName).toBe("Updated By RLS Test");
      });
    });

    it("User A cannot update User B's display name (USING excludes the row)", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(users)
          .set({ displayName: "Hijacked" })
          .where(eq(users.id, USER_B_ID))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });
  });

  describe("accounts", () => {
    it("User A can read own accounts but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
          .returning();
        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "B Checking", accountType: "checking" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(accounts).where(eq(accounts.id, accountA.id));
        const other = await tx.select().from(accounts).where(eq(accounts.id, accountB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert an account with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "New", accountType: "checking" })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert an account owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(accounts).values({ ownerId: USER_B_ID, name: "Planted", accountType: "checking" });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's account", async () => {
      await withRollback(db, async (tx) => {
        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "B Checking", accountType: "checking" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.update(accounts).set({ name: "Hijacked" }).where(eq(accounts.id, accountB.id)).returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own account to User B", async () => {
      // Since 0004_harden_owned_table_update_grants.sql, owner_id isn't in
      // the grantable column set at all, so this is now denied at the
      // grant-check level (a stronger guarantee) before RLS's WITH CHECK
      // is ever reached.
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(accounts).set({ ownerId: USER_B_ID }).where(eq(accounts.id, accountA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(accounts).where(eq(accounts.id, accountA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("categories", () => {
    it("User A can read own categories but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Housing" }).returning();
        const [categoryB] = await tx.insert(categories).values({ ownerId: USER_B_ID, name: "Housing" }).returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(categories).where(eq(categories.id, categoryA.id));
        const other = await tx.select().from(categories).where(eq(categories.id, categoryB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert a category with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Food" }).returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert a category owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(categories).values({ ownerId: USER_B_ID, name: "Planted" });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's category", async () => {
      await withRollback(db, async (tx) => {
        const [categoryB] = await tx.insert(categories).values({ ownerId: USER_B_ID, name: "Housing" }).returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(categories)
          .set({ name: "Hijacked" })
          .where(eq(categories.id, categoryB.id))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own category to User B", async () => {
      // Denied at the grant-check level now — see the accounts test above.
      await expectDenied(
        withRollback(db, async (tx) => {
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Housing" }).returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(categories).set({ ownerId: USER_B_ID }).where(eq(categories.id, categoryA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Housing" }).returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(categories).where(eq(categories.id, categoryA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("transactions", () => {
    it("User A can read own transactions but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
          .returning();
        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "B Checking", accountType: "checking" })
          .returning();
        const [txnA] = await tx
          .insert(transactions)
          .values({
            ownerId: USER_A_ID,
            accountId: accountA.id,
            transactionDate: "2026-08-01",
            originalDescription: "A TXN",
            amount: "-10.00",
            transactionType: "expense",
          })
          .returning();
        const [txnB] = await tx
          .insert(transactions)
          .values({
            ownerId: USER_B_ID,
            accountId: accountB.id,
            transactionDate: "2026-08-01",
            originalDescription: "B TXN",
            amount: "-10.00",
            transactionType: "expense",
          })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(transactions).where(eq(transactions.id, txnA.id));
        const other = await tx.select().from(transactions).where(eq(transactions.id, txnB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert a transaction with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(transactions)
          .values({
            ownerId: USER_A_ID,
            accountId: accountA.id,
            transactionDate: "2026-08-01",
            originalDescription: "New",
            amount: "-5.00",
            transactionType: "expense",
          })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert a transaction owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountB] = await tx
            .insert(accounts)
            .values({ ownerId: USER_B_ID, name: "B Checking", accountType: "checking" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(transactions).values({
            ownerId: USER_B_ID,
            accountId: accountB.id,
            transactionDate: "2026-08-01",
            originalDescription: "Planted",
            amount: "-5.00",
            transactionType: "expense",
          });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's transaction", async () => {
      await withRollback(db, async (tx) => {
        const [accountB] = await tx
          .insert(accounts)
          .values({ ownerId: USER_B_ID, name: "B Checking", accountType: "checking" })
          .returning();
        const [txnB] = await tx
          .insert(transactions)
          .values({
            ownerId: USER_B_ID,
            accountId: accountB.id,
            transactionDate: "2026-08-01",
            originalDescription: "B TXN",
            amount: "-10.00",
            transactionType: "expense",
          })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(transactions)
          .set({ notes: "Hijacked" })
          .where(eq(transactions.id, txnB.id))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own transaction to User B", async () => {
      // Denied at the grant-check level now — see the accounts test above.
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          const [txnA] = await tx
            .insert(transactions)
            .values({
              ownerId: USER_A_ID,
              accountId: accountA.id,
              transactionDate: "2026-08-01",
              originalDescription: "A TXN",
              amount: "-10.00",
              transactionType: "expense",
            })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(transactions).set({ ownerId: USER_B_ID }).where(eq(transactions.id, txnA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          const [txnA] = await tx
            .insert(transactions)
            .values({
              ownerId: USER_A_ID,
              accountId: accountA.id,
              transactionDate: "2026-08-01",
              originalDescription: "A TXN",
              amount: "-10.00",
              transactionType: "expense",
            })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(transactions).where(eq(transactions.id, txnA.id));
        }),
        /permission denied/,
      );
    });
  });

  describe("data_provider_connections", () => {
    it("User A can read own connections but not User B's", async () => {
      await withRollback(db, async (tx) => {
        const [connA] = await tx
          .insert(dataProviderConnections)
          .values({ ownerId: USER_A_ID, providerName: "manual" })
          .returning();
        const [connB] = await tx
          .insert(dataProviderConnections)
          .values({ ownerId: USER_B_ID, providerName: "manual" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const own = await tx.select().from(dataProviderConnections).where(eq(dataProviderConnections.id, connA.id));
        const other = await tx
          .select()
          .from(dataProviderConnections)
          .where(eq(dataProviderConnections.id, connB.id));

        expect(own).toHaveLength(1);
        expect(other).toHaveLength(0);
      });
    });

    it("User A can insert a connection with owner_id = self", async () => {
      await withRollback(db, async (tx) => {
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx
          .insert(dataProviderConnections)
          .values({ ownerId: USER_A_ID, providerName: "manual" })
          .returning();
        expect(row.ownerId).toBe(USER_A_ID);
      });
    });

    it("User A cannot insert a connection owned by User B", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(dataProviderConnections).values({ ownerId: USER_B_ID, providerName: "manual" });
        }),
        /row-level security/,
      );
    });

    it("User A cannot update User B's connection", async () => {
      await withRollback(db, async (tx) => {
        const [connB] = await tx
          .insert(dataProviderConnections)
          .values({ ownerId: USER_B_ID, providerName: "manual" })
          .returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx
          .update(dataProviderConnections)
          .set({ status: "error" })
          .where(eq(dataProviderConnections.id, connB.id))
          .returning();
        expect(rows).toHaveLength(0);
      });
    });

    it("User A cannot reassign their own connection to User B", async () => {
      // Denied at the grant-check level now — see the accounts test above.
      await expectDenied(
        withRollback(db, async (tx) => {
          const [connA] = await tx
            .insert(dataProviderConnections)
            .values({ ownerId: USER_A_ID, providerName: "manual" })
            .returning();

          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx
            .update(dataProviderConnections)
            .set({ ownerId: USER_B_ID })
            .where(eq(dataProviderConnections.id, connA.id));
        }),
        /permission denied/,
      );
    });

    it("matches the approved policy: no DELETE grant, so deletes are rejected outright", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [connA] = await tx
            .insert(dataProviderConnections)
            .values({ ownerId: USER_A_ID, providerName: "manual" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(dataProviderConnections).where(eq(dataProviderConnections.id, connA.id));
        }),
        /permission denied/,
      );
    });
  });

  // 0004_harden_owned_table_update_grants.sql: column-level UPDATE grants
  // reinforce the RLS WITH CHECK at a level RLS can't reach (row-scoped,
  // not column-scoped) — id/owner_id/created_at/updated_at/deleted_at are
  // not grantee-writable at all, independent of what any policy allows.
  describe("column-level UPDATE hardening on owned tables", () => {
    it("User A cannot update accounts.id or accounts.deleted_at even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(accounts).set({ id: randomUUID() }).where(eq(accounts.id, accountA.id));
        }),
        /permission denied/,
      );
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(accounts).set({ deletedAt: new Date() }).where(eq(accounts.id, accountA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot update categories.id or categories.deleted_at even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [categoryA] = await tx.insert(categories).values({ ownerId: USER_A_ID, name: "Housing" }).returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(categories).set({ deletedAt: new Date() }).where(eq(categories.id, categoryA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot update transactions.id or transactions.deleted_at even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [accountA] = await tx
            .insert(accounts)
            .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
            .returning();
          const [txnA] = await tx
            .insert(transactions)
            .values({
              ownerId: USER_A_ID,
              accountId: accountA.id,
              transactionDate: "2026-08-01",
              originalDescription: "A TXN",
              amount: "-10.00",
              transactionType: "expense",
            })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(transactions).set({ deletedAt: new Date() }).where(eq(transactions.id, txnA.id));
        }),
        /permission denied/,
      );
    });

    it("User A cannot update data_provider_connections.id or .deleted_at even on their own row", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [connA] = await tx
            .insert(dataProviderConnections)
            .values({ ownerId: USER_A_ID, providerName: "manual" })
            .returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(dataProviderConnections).set({ deletedAt: new Date() }).where(eq(dataProviderConnections.id, connA.id));
        }),
        /permission denied/,
      );
    });

    it("legitimate mutable columns remain updatable (accounts.name)", async () => {
      await withRollback(db, async (tx) => {
        const [accountA] = await tx
          .insert(accounts)
          .values({ ownerId: USER_A_ID, name: "A Checking", accountType: "checking" })
          .returning();
        await runAsAuthenticatedUser(tx, USER_A_ID);
        const [row] = await tx.update(accounts).set({ name: "Renamed" }).where(eq(accounts.id, accountA.id)).returning();
        expect(row.name).toBe("Renamed");
      });
    });
  });

  describe("institutions", () => {
    it("authenticated users can read institutions", async () => {
      await withRollback(db, async (tx) => {
        const [institution] = await tx.insert(institutions).values({ name: "Test Bank RLS" }).returning();

        await runAsAuthenticatedUser(tx, USER_A_ID);
        const rows = await tx.select().from(institutions).where(eq(institutions.id, institution.id));
        expect(rows).toHaveLength(1);
      });
    });

    it("authenticated users cannot insert institutions", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.insert(institutions).values({ name: "Rogue Bank" });
        }),
        /permission denied/,
      );
    });

    it("authenticated users cannot update institutions", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [institution] = await tx.insert(institutions).values({ name: "Test Bank RLS" }).returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.update(institutions).set({ name: "Hijacked" }).where(eq(institutions.id, institution.id));
        }),
        /permission denied/,
      );
    });

    it("authenticated users cannot delete institutions", async () => {
      await expectDenied(
        withRollback(db, async (tx) => {
          const [institution] = await tx.insert(institutions).values({ name: "Test Bank RLS" }).returning();
          await runAsAuthenticatedUser(tx, USER_A_ID);
          await tx.delete(institutions).where(eq(institutions.id, institution.id));
        }),
        /permission denied/,
      );
    });
  });
});
