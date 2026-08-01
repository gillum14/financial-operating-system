"use client";

import { useActionState } from "react";

import { resetPassword, type AuthActionState } from "../(auth)/actions";
import { FormField, FormMessage } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormField id="password" label="New password" type="password" autoComplete="new-password" />
      <p className="text-xs text-[var(--foreground-muted)]">At least 8 characters.</p>

      <FormMessage state={state} />

      <SubmitButton pendingText="Updating…">Update password</SubmitButton>
    </form>
  );
}
