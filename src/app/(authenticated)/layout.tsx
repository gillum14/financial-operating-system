import type { ReactNode } from "react";

import { AppHeader } from "@/components/navigation/app-header";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { currentUser } from "@/lib/session";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppSidebar user={currentUser} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
