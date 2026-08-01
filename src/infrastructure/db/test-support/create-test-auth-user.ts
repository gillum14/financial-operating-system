import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";

import type { DbClient } from "@/db/client";

// public.users.id now has a foreign key to auth.users.id (see
// src/db/migrations/0001_wooden_shen.sql), so any DB-gated test that needs
// a valid profile row for a fictional user must first satisfy that
// constraint. This inserts the minimal viable auth.users row directly —
// only `id` is NOT NULL without a default on that table (verified against
// the live schema) — and is only ever used inside the withRollback
// transaction these tests already run in, so nothing persists. It is not a
// substitute for real Supabase Auth signup; it exists purely to unblock
// FK-adjacent fixtures for tests where Auth itself isn't the subject.
export async function createTestAuthUser(
  db: DbClient,
  overrides: { id?: string; email?: string } = {},
): Promise<{ id: string; email: string }> {
  const id = overrides.id ?? randomUUID();
  const email = overrides.email ?? `test-${id}@example.com`;

  await db.execute(sql`insert into auth.users (id, email) values (${id}, ${email})`);

  return { id, email };
}
