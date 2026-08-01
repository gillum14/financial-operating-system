import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth/authenticated-user";

// A signed-in user shouldn't linger on login/signup/etc. — bounce to the
// dashboard immediately. Uses getAuthenticatedUser() (non-throwing), not
// requireAuthenticatedUser(), since being unauthenticated is the expected
// case here, not an error.
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12 text-[var(--foreground)]">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
