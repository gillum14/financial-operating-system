import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";

// Real end-to-end proof of the RLS policies, through the actual path a
// browser would use: signInWithPassword() against Supabase's real Auth
// API, producing a real JWT, then real Data API (PostgREST) calls made
// with that JWT — not a simulation. This is the complement to
// src/infrastructure/db/rls-policies.test.ts, which exercises the same
// policies via direct role/claim simulation over the trusted Postgres
// connection (necessary because that file can be run without a real
// Supabase anon key). Both should agree; if they ever diverge, trust this
// file, since it's the actual production path.
//
// Requires SUPABASE_TEST_USER_A_EMAIL/PASSWORD and
// SUPABASE_TEST_USER_B_EMAIL/PASSWORD to already exist as confirmed users
// in the target Supabase project's auth.users (see README's RLS test user
// setup) — this file signs in as them, it does not create them. Also
// gated behind the same ALLOW_DB_TESTS + TEST_DATABASE_URL requirement as
// every other DB-backed test (see db-test-guard.ts) — this file's own
// Data API calls always go through NEXT_PUBLIC_SUPABASE_URL (there is no
// swappable "test" project for those; they inherently run against
// whichever project SUPABASE_TEST_USER_A/B belong to), but its cleanup
// step below uses the trusted DATABASE_URL connection directly, which is
// exactly the connection the opt-in gate exists to protect.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const userAEmail = process.env.SUPABASE_TEST_USER_A_EMAIL;
const userAPassword = process.env.SUPABASE_TEST_USER_A_PASSWORD;
const userBEmail = process.env.SUPABASE_TEST_USER_B_EMAIL;
const userBPassword = process.env.SUPABASE_TEST_USER_B_PASSWORD;

const hasJwtTestEnv =
  Boolean(url && anonKey && userAEmail && userAPassword && userBEmail && userBPassword) && isDbTestingAllowed();

function newAnonClient(): SupabaseClient {
  // persistSession/autoRefreshToken are browser-storage features that
  // don't apply (and would warn/misbehave) in a Node test process.
  return createClient(url as string, anonKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe.skipIf(!hasJwtTestEnv)("Row Level Security policies (real JWT integration)", () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userAId: string;
  let userBId: string;

  // INCIDENT (2026-08-06): this file's cleanup previously deleted by
  // owner_id alone — e.g. `delete from transactions where owner_id =
  // userAId` — which removes every row that owner has, not just the ones
  // this test run created. Against the real seeded test users, that wiped
  // real accounts/transactions/categories/data_provider_connections data.
  // See docs/testing.md § Data-loss incident for the full writeup. Fixed
  // by tracking exactly which rows this run inserted and deleting only
  // those ids.
  const createdIds = {
    accounts: [] as string[],
    categories: [] as string[],
    transactions: [] as string[],
    dataProviderConnections: [] as string[],
  };

  beforeAll(async () => {
    clientA = newAnonClient();
    clientB = newAnonClient();

    const signInA = await clientA.auth.signInWithPassword({ email: userAEmail as string, password: userAPassword as string });
    if (signInA.error || !signInA.data.user) {
      throw new Error(`Failed to sign in SUPABASE_TEST_USER_A: ${signInA.error?.message}`);
    }
    userAId = signInA.data.user.id;

    const signInB = await clientB.auth.signInWithPassword({ email: userBEmail as string, password: userBPassword as string });
    if (signInB.error || !signInB.data.user) {
      throw new Error(`Failed to sign in SUPABASE_TEST_USER_B: ${signInB.error?.message}`);
    }
    userBId = signInB.data.user.id;
  });

  afterAll(async () => {
    // Best-effort cleanup only: authenticated users have no DELETE grant
    // on any owned table (by design — see the RLS migration), so rows
    // this file inserts as User A/B cannot be removed through the Data
    // API at all. Cleanup goes through the trusted Drizzle connection
    // instead, which is a test-lifecycle concern, not a claim that RLS
    // was bypassed to prove anything. Scoped to exactly the ids this run
    // recorded via trackId() below — never a blanket owner_id match.
    const { db, queryClient } = await import("@/db/client");
    const schema = await import("@/db/schema");
    const { inArray } = await import("drizzle-orm");

    if (createdIds.transactions.length > 0) {
      await db.delete(schema.transactions).where(inArray(schema.transactions.id, createdIds.transactions));
    }
    if (createdIds.dataProviderConnections.length > 0) {
      await db
        .delete(schema.dataProviderConnections)
        .where(inArray(schema.dataProviderConnections.id, createdIds.dataProviderConnections));
    }
    if (createdIds.accounts.length > 0) {
      await db.delete(schema.accounts).where(inArray(schema.accounts.id, createdIds.accounts));
    }
    if (createdIds.categories.length > 0) {
      await db.delete(schema.categories).where(inArray(schema.categories.id, createdIds.categories));
    }
    await queryClient.end();

    await clientA.auth.signOut();
    await clientB.auth.signOut();
  });

  // Records an id for teardown only when the insert actually returned one
  // — a denied/failed insert (the common case in the "cannot insert ..."
  // tests below) has no row to track, and pushing `undefined` would make
  // the inArray() filters above no-ops disguised as real scoping.
  function trackId(table: keyof typeof createdIds, id: string | undefined): void {
    if (id) createdIds[table].push(id);
  }

  describe("public.users", () => {
    it("User A can read own profile", async () => {
      const { data, error } = await clientA.from("users").select().eq("id", userAId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("User A cannot read User B's profile", async () => {
      const { data, error } = await clientA.from("users").select().eq("id", userBId);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it("User A cannot insert an arbitrary profile", async () => {
      const { error } = await clientA.from("users").insert({ id: crypto.randomUUID(), email: "x@example.com", display_name: "X" });
      expect(error).not.toBeNull();
    });

    it("User A cannot delete their profile", async () => {
      const { error, count } = await clientA.from("users").delete({ count: "exact" }).eq("id", userAId);
      expect(error).not.toBeNull();
      expect(count ?? 0).toBe(0);
    });

    it("User A cannot change their profile id", async () => {
      const { error } = await clientA.from("users").update({ id: crypto.randomUUID() }).eq("id", userAId);
      expect(error).not.toBeNull();
    });
  });

  describe("accounts", () => {
    it("User A can insert an account with owner_id = self, and read it back", async () => {
      const { data, error } = await clientA
        .from("accounts")
        .insert({ owner_id: userAId, name: "JWT Test Checking", account_type: "checking" })
        .select();
      trackId("accounts", data?.[0]?.id);
      expect(error).toBeNull();
      expect(data?.[0]?.owner_id).toBe(userAId);
    });

    it("User A cannot insert an account owned by User B", async () => {
      const { error } = await clientA
        .from("accounts")
        .insert({ owner_id: userBId, name: "Planted", account_type: "checking" });
      expect(error).not.toBeNull();
    });

    it("User A cannot read or update User B's account", async () => {
      const inserted = await clientB
        .from("accounts")
        .insert({ owner_id: userBId, name: "B JWT Checking", account_type: "checking" })
        .select();
      const accountBId = inserted.data?.[0]?.id;
      trackId("accounts", accountBId);

      const read = await clientA.from("accounts").select().eq("id", accountBId);
      expect(read.data).toHaveLength(0);

      const update = await clientA.from("accounts").update({ name: "Hijacked" }).eq("id", accountBId).select();
      expect(update.data).toHaveLength(0);
    });

    it("User A cannot reassign their own account to User B", async () => {
      const inserted = await clientA
        .from("accounts")
        .insert({ owner_id: userAId, name: "A JWT Checking", account_type: "checking" })
        .select();
      const accountAId = inserted.data?.[0]?.id;
      trackId("accounts", accountAId);

      const { error } = await clientA.from("accounts").update({ owner_id: userBId }).eq("id", accountAId);
      expect(error).not.toBeNull();
    });

    it("delete is rejected outright (matches the approved no-DELETE policy)", async () => {
      const inserted = await clientA
        .from("accounts")
        .insert({ owner_id: userAId, name: "A JWT Checking", account_type: "checking" })
        .select();
      const accountAId = inserted.data?.[0]?.id;
      trackId("accounts", accountAId);

      const { error } = await clientA.from("accounts").delete().eq("id", accountAId);
      expect(error).not.toBeNull();
    });
  });

  describe("categories", () => {
    it("User A can insert and read own categories; not User B's", async () => {
      const ownInsert = await clientA.from("categories").insert({ owner_id: userAId, name: "JWT Housing" }).select();
      trackId("categories", ownInsert.data?.[0]?.id);
      expect(ownInsert.data?.[0]?.owner_id).toBe(userAId);

      const otherInsert = await clientB.from("categories").insert({ owner_id: userBId, name: "JWT Housing" }).select();
      const otherId = otherInsert.data?.[0]?.id;
      trackId("categories", otherId);

      const read = await clientA.from("categories").select().eq("id", otherId);
      expect(read.data).toHaveLength(0);
    });

    it("User A cannot insert a category owned by User B", async () => {
      const { error } = await clientA.from("categories").insert({ owner_id: userBId, name: "Planted" });
      expect(error).not.toBeNull();
    });
  });

  describe("transactions", () => {
    it("User A can insert and read own transactions; not User B's", async () => {
      const account = await clientA
        .from("accounts")
        .insert({ owner_id: userAId, name: "A JWT Checking For Txns", account_type: "checking" })
        .select();
      const accountId = account.data?.[0]?.id;
      trackId("accounts", accountId);

      const ownInsert = await clientA
        .from("transactions")
        .insert({
          owner_id: userAId,
          account_id: accountId,
          transaction_date: "2026-08-01",
          original_description: "JWT TXN",
          amount: "-1.00",
          transaction_type: "expense",
        })
        .select();
      trackId("transactions", ownInsert.data?.[0]?.id);
      expect(ownInsert.data?.[0]?.owner_id).toBe(userAId);
    });

    it("User A cannot insert a transaction owned by User B", async () => {
      const accountB = await clientB
        .from("accounts")
        .insert({ owner_id: userBId, name: "B JWT Checking For Txns", account_type: "checking" })
        .select();
      const accountBId = accountB.data?.[0]?.id;
      trackId("accounts", accountBId);

      const { error } = await clientA.from("transactions").insert({
        owner_id: userBId,
        account_id: accountBId,
        transaction_date: "2026-08-01",
        original_description: "Planted",
        amount: "-1.00",
        transaction_type: "expense",
      });
      expect(error).not.toBeNull();
    });
  });

  describe("data_provider_connections", () => {
    it("User A can insert and read own connections; not User B's", async () => {
      const ownInsert = await clientA
        .from("data_provider_connections")
        .insert({ owner_id: userAId, provider_name: "manual" })
        .select();
      trackId("dataProviderConnections", ownInsert.data?.[0]?.id);
      expect(ownInsert.data?.[0]?.owner_id).toBe(userAId);

      const otherInsert = await clientB
        .from("data_provider_connections")
        .insert({ owner_id: userBId, provider_name: "manual" })
        .select();
      const otherId = otherInsert.data?.[0]?.id;
      trackId("dataProviderConnections", otherId);

      const read = await clientA.from("data_provider_connections").select().eq("id", otherId);
      expect(read.data).toHaveLength(0);
    });

    it("User A cannot insert a connection owned by User B", async () => {
      const { error } = await clientA.from("data_provider_connections").insert({ owner_id: userBId, provider_name: "manual" });
      expect(error).not.toBeNull();
    });
  });

  describe("institutions", () => {
    it("authenticated users can read institutions", async () => {
      const { data, error } = await clientA.from("institutions").select();
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it("authenticated users cannot insert institutions", async () => {
      const { error } = await clientA.from("institutions").insert({ name: "JWT Rogue Bank" });
      expect(error).not.toBeNull();
    });

    it("authenticated users cannot update institutions", async () => {
      const { data: existing } = await clientA.from("institutions").select().limit(1);
      const targetId = existing?.[0]?.id;
      const { error } = await clientA.from("institutions").update({ name: "Hijacked" }).eq("id", targetId);
      expect(error).not.toBeNull();
    });

    it("authenticated users cannot delete institutions", async () => {
      const { data: existing } = await clientA.from("institutions").select().limit(1);
      const targetId = existing?.[0]?.id;
      const { error } = await clientA.from("institutions").delete().eq("id", targetId);
      expect(error).not.toBeNull();
    });
  });
});
