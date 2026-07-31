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

export const queryClient =
  globalForDb.queryClient ??
  postgres(env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
