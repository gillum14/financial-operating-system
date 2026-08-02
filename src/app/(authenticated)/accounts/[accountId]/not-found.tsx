import Link from "next/link";
import { SearchX } from "lucide-react";

import Card from "@/components/ui/card";

// Rendered for both "doesn't exist" and "belongs to another owner" —
// getAccountDetailView() can't and shouldn't distinguish those from here.
export default function AccountNotFound() {
  return (
    <Card className="flex flex-col items-center py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
        <SearchX className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <p className="mt-4 text-base font-semibold text-[var(--foreground)]">Account not found</p>
      <p className="mt-1 max-w-sm text-sm text-[var(--foreground-muted)]">
        This account doesn&apos;t exist or is no longer available to you.
      </p>
      <Link
        href="/accounts"
        className="mt-4 rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
      >
        Back to Accounts
      </Link>
    </Card>
  );
}
