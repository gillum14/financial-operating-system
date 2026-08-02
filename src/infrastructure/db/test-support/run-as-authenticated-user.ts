import { sql } from "drizzle-orm";

import type { DbClient } from "@/db/client";

// Puts the current transaction into the exact session state PostgREST puts
// a request into for a real authenticated call: the `authenticated` role,
// with auth.uid() resolving from a `request.jwt.claims` GUC (see
// `select pg_get_functiondef('auth.uid'::regproc)` — that's literally
// where auth.uid() reads from). This is not a simulation of a *different*
// mechanism than production uses; it's the same mechanism, exercised
// without the HTTP/PostgREST layer in front of it — which is Supabase-
// managed and not something this codebase can test directly anyway.
//
// Must be called inside a transaction (see withRollback) — SET LOCAL and
// set_config(..., true) are both transaction-scoped and revert
// automatically at COMMIT/ROLLBACK, so the connection's underlying
// `postgres` superuser role is never at risk of leaking into later queries.
export async function runAsAuthenticatedUser(tx: DbClient, userId: string): Promise<void> {
  await tx.execute(sql`SET LOCAL ROLE authenticated`);
  await tx.execute(
    sql`SELECT set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`,
  );
}
