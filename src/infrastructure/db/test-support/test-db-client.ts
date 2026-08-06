import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";
import type { DbClient } from "@/db/client";

import { evaluateDbTestGuard, type DbTestGuardEnv } from "./db-test-guard";

// The one way any DB-backed integration test may obtain a real connection.
// Deliberately separate from @/db/client (the app's own singleton, built
// from DATABASE_URL) — see db-test-guard.ts for why. Throws if the guard
// refuses; callers gate their describe.skipIf on isDbTestingAllowed()
// first, so in practice this only runs when the guard has already passed.
export function isDbTestingAllowed(env: DbTestGuardEnv = process.env): boolean {
  return evaluateDbTestGuard(env).allowed;
}

export function createTestDbClient(): { db: DbClient; queryClient: postgres.Sql; close: () => Promise<void> } {
  const guard = evaluateDbTestGuard();
  if (!guard.allowed) {
    throw new Error(`DB-backed tests are not allowed: ${guard.reason}`);
  }

  // No connection pooling here beyond max: 1 — same conservative shape as
  // @/db/client, and each test file gets its own instance/connection
  // rather than sharing the app's singleton.
  const queryClient = postgres(guard.connectionString!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  const db = drizzle(queryClient, { schema }) as DbClient;

  return { db, queryClient, close: () => queryClient.end() };
}
