"use client";

import { useFormStatus } from "react-dom";

// Disables the button (and shows pending copy) for the whole duration of
// the request — the primary defense against repeated/accidental double
// submissions, alongside the server action's own idempotent handling.
export function SubmitButton({ children, pendingText }: { children: string; pendingText: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="w-full rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingText : children}
    </button>
  );
}
