"use client";

import { useEffect } from "react";

import Card from "@/components/ui/card";

export default function AccountDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Account detail page failed to load:", error);
  }, [error]);

  return (
    <Card className="text-center">
      <p className="text-lg font-semibold text-[var(--foreground)]">Unable to load this account</p>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">Something went wrong. Please try again.</p>
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
