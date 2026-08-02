import "server-only";

import { type AuthenticatedUser, getAuthenticatedUser } from "@/lib/auth/authenticated-user";

import { AuthenticationError } from "./errors";

// The authentication entry point for Server Actions. Distinct from
// requireAuthenticatedUser() (used by Server Components/layouts), which
// redirects on failure — a mutation should never hijack navigation
// mid-submission. This throws instead, so executeAction() can classify it
// and return a typed ActionResult failure through the same channel as every
// other error, keeping useActionState/form call sites uniform.
//
// The returned user.id is the only source of "who owns this write" a
// Server Action should ever use — never a client-supplied owner/user id.
export async function requireActionUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
}
