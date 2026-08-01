import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Minimal trusted identity shape — no presentation logic, nothing beyond
// what's needed to authorize and label a request. `emailConfirmedAt` is the
// lightweight assurance signal: null means the account exists in
// auth.users but hasn't completed email confirmation.
export interface AuthenticatedUser {
  id: string;
  email: string;
  emailConfirmedAt: string | null;
}

// Single source of truth for "who is making this request." Wrapped in
// React's cache() so multiple calls within one request (e.g. from both the
// (authenticated) layout and the dashboard page) only hit Supabase's Auth
// server once, per "avoid duplicating authentication verification
// throughout pages and actions."
//
// Uses supabase.auth.getUser(), not getSession(): getSession() only reads
// the local cookie and does not verify it against the Auth server, so it
// must never be treated as authorization evidence.
export const getAuthenticatedUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    emailConfirmedAt: user.email_confirmed_at ?? null,
  };
});

// The authoritative gate for protected server-rendered content. Never
// returns null — redirects to /login when no verified user exists, so
// callers can treat the return value as a guaranteed-present identity.
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
