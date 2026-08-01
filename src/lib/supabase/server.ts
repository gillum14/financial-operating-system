import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseEnv } from "@/lib/supabase-env";

// Server-side Supabase client for Server Components, Server Actions, and
// Route Handlers. Cookie writes silently no-op when called from a Server
// Component (cookies are read-only there) — that's fine because
// src/proxy.ts's session refresh is what actually persists refreshed
// tokens back to the browser on every request.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseEnv.NEXT_PUBLIC_SUPABASE_URL, supabaseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — no-op, see comment above.
        }
      },
    },
  });
}
