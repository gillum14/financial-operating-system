"use client";

import { useActionState, useEffect, useState } from "react";

import { resendConfirmation, type AuthActionState } from "@/app/(auth)/actions";

const COOLDOWN_SECONDS = 30;
const initialState: AuthActionState = {};

// Cooldown here is pure UX (prevents spam-clicking) — the real enforcement
// is Supabase's own rate limit on the resend endpoint, handled generically
// by resendConfirmation() if it's hit anyway.
export function ResendConfirmationButton({ email }: { email: string }) {
  const [state, formAction] = useActionState(resendConfirmation, initialState);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  return (
    <form
      action={(formData) => {
        setCooldown(COOLDOWN_SECONDS);
        formAction(formData);
      }}
      className="mt-3 text-center"
    >
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={cooldown > 0}
        className="text-sm text-[var(--primary)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--foreground-muted)] disabled:no-underline"
      >
        {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend confirmation email"}
      </button>
      {state.error && <p className="mt-1 text-xs text-[var(--danger)]">{state.error}</p>}
    </form>
  );
}
