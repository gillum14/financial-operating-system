import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase-env";

// Refreshes the Supabase session cookie on every request that passes
// through middleware. This does NOT authorize anything by itself — route
// protection is a separate, explicit step in src/middleware.ts. Without
// this, access/refresh tokens would silently expire and users would be
// logged out unpredictably between visits.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseEnv.NEXT_PUBLIC_SUPABASE_URL, supabaseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() (not getSession()) is required here: it revalidates the JWT
  // against Supabase's Auth server rather than trusting the local cookie,
  // and as a side effect this call is what triggers the token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
