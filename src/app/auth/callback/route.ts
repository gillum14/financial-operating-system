import { NextResponse, type NextRequest } from "next/server";

import { resolveSafeRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

// Handles both email-confirmation and password-recovery links: Supabase
// redirects here with a `code` param after the user clicks the email link;
// exchanging it for a session is what actually completes confirmation or
// establishes the temporary recovery session reset-password depends on.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = resolveSafeRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    if (error instanceof Error) {
      console.error("[auth:callback]", error.message);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
