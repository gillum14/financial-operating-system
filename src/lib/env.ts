import { z } from "zod";

// Only what the Drizzle/Postgres client needs. Deliberately does not
// include the Supabase Auth vars (see src/lib/supabase-env.ts) — db/client.ts
// (and everything built on it: repositories, migrations, `db:seed`, the
// DB-gated integration tests) must keep working with only a DATABASE_URL,
// independent of whether Supabase Auth is configured at all.
//
// No "server-only" marker here (deliberately, unlike supabase-env.ts):
// db/client.ts and its whole dependency chain must stay importable from
// `tsx`-run scripts (db:seed) outside of Next.js's build system, where
// "server-only" throws unconditionally rather than being a no-op. This
// module was never reachable from client code anyway — nothing browser-
// bundled imports @/db/client — so the marker added no real protection.
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = parsed.data;
