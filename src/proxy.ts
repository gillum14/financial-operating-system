import { NextResponse, type NextRequest } from "next/server";

import { resolveSafeRedirect } from "@/lib/auth/redirect";
import { updateSession } from "@/lib/supabase/middleware";

// Public (unauthenticated-accessible) paths. Everything else is protected
// by default — fail closed, not fail open, appropriate for a financial app.
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Defense in depth only. The authoritative check is
// requireAuthenticatedUser() in src/lib/auth/authenticated-user.ts, called
// server-side in the (authenticated) layout and dashboard page — this
// proxy (formerly "middleware" — renamed by Next.js; see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)
// cannot be the only thing standing between a request and protected
// financial data.
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", resolveSafeRedirect(`${pathname}${search}`));
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
