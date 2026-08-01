import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Uses the anon key only — safe for the
// client bundle by design. Reads process.env.NEXT_PUBLIC_* directly and
// inline (not via src/lib/env.ts) so Next.js can statically replace these
// specific expressions at build time; an indirected re-export would not be
// inlined the same way.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
