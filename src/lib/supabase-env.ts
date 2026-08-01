import "server-only";

import { z } from "zod";

// Validated independently from src/lib/env.ts (DATABASE_URL) so that
// database-only tooling (migrations, seeding, repository tests) never
// requires Supabase Auth to be configured, and vice versa. Only
// src/lib/supabase/server.ts, src/lib/supabase/middleware.ts, and the auth
// Server Actions import this.
//
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are validated
// here for server-side fail-fast behavior, but browser code must read
// process.env.NEXT_PUBLIC_* directly and inline (see src/lib/supabase/client.ts)
// rather than importing this module — Next.js only statically inlines the
// literal `process.env.NEXT_PUBLIC_X` expression into client bundles, not a
// re-export of an object built from it.
const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // The app's own origin, used to build absolute email-confirmation/
  // password-reset redirect URLs. Must be listed in Supabase's Auth
  // redirect URL allowlist and match the configured Site URL in
  // production. Defaults to http://localhost:3000 for local development.
  SITE_URL: z.string().url().default("http://localhost:3000"),
});

const parsed = supabaseEnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid Supabase Auth environment variables: ${parsed.error.message}`);
}

export const supabaseEnv = parsed.data;
