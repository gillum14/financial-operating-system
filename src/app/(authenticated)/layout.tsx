import type { ReactNode } from "react";

import { AppHeader } from "@/components/navigation/app-header";
import { AppSidebar, type SidebarUser } from "@/components/navigation/app-sidebar";
import { getUserProfile } from "@/composition/user-profile";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// This layout is the authoritative gate for every route under
// (authenticated) — requireAuthenticatedUser() redirects to /login itself
// when no verified user exists, so nothing below it can render without one.
// src/proxy.ts also redirects unauthenticated requests, but that's
// defense in depth, not the check this depends on.
export default async function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const authUser = await requireAuthenticatedUser();
  const profile = await getUserProfile(authUser.id);

  const displayName = profile?.displayName ?? authUser.email;
  const sidebarUser: SidebarUser = {
    displayName,
    email: authUser.email,
    initials: getInitials(displayName),
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppSidebar user={sidebarUser} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
