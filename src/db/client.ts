import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

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

export const db = drizzle(queryClient);
