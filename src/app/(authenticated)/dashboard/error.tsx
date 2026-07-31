"use client";

import { useEffect } from "react";

import Card from "@/components/ui/card";

// Catches errors thrown while resolving the development owner or loading
// the dashboard snapshot (e.g. database unavailable, misconfigured
// DEVELOPMENT_OWNER_ID). Deliberately never renders `error.message` —
// Next.js redacts server-error messages to a generic string in production
// anyway, but this stays safe regardless of environment or what the
// underlying error happens to say.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Dashboard failed to load:", error);
  }, [error]);

  return (
    <Card className="text-center">
      <p className="text-lg font-semibold text-[var(--foreground)]">Unable to load your dashboard</p>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Something went wrong while loading your financial data. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </Card>
  );
}
