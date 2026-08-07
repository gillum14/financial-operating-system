import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

// Common base type shared by the top-level `db` client and the `tx` object
// passed into `db.transaction(...)` callbacks (PgTransaction extends
// PgDatabase), so repositories built against this type work with either.
export type DbClient = PgDatabase<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

// Cached on globalThis in non-production so Next.js dev-mode HMR reuses the
// same connection instead of opening a new one on every module reload.
const globalForDb = globalThis as unknown as {
  queryClient?: postgres.Sql;
};

// max was previously 1. Raised after a reproducible investigation (see
// src/composition/accounts-query.ts's module comment and
// accounts-query.test.ts's "concurrent LIMIT query" block): with exactly
// one connection, any query carrying a LIMIT clause (a single-row-by-id
// lookup — an ordinary, unavoidable pattern, not a mistake) run
// concurrently with 2+ sibling queries reliably wedged the connection
// indefinitely, and — separately — even fully sequential, LIMIT-free
// batches matching this codebase's own established "good" pattern
// (DashboardService's Promise.all) showed non-trivial intermittent
// failures under repeated reuse across requests in one long-lived
// process. Testing the identical adversarial query sequence against
// max: 5 instead of max: 1 was reliable across every trial. DATABASE_URL
// already points at Supabase's PgBouncer transaction pooler, which is
// designed for many small per-process pools like this one; 5 is a modest
// increase, not "big enough to paper over anything."
export const queryClient =
  globalForDb.queryClient ??
  postgres(env.DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
