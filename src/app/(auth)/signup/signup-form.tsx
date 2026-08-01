"use client";

import { useActionState } from "react";

import { signup, type AuthActionState } from "../actions";
import { FormField, FormMessage } from "@/components/auth/form-field";
import { ResendConfirmationButton } from "@/components/auth/resend-confirmation-button";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction] = useActionState(signup, initialState);

  // Once we get a response (success or error), the form's job is done —
  // showing the fields again alongside a "check your email" message would
  // invite a confusing repeat submission.
  if (state.message) {
    return (
      <div>
        <FormMessage state={state} />
        {state.email && <ResendConfirmationButton email={state.email} />}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormField id="email" label="Email" type="email" autoComplete="email" />
      <FormField id="password" label="Password" type="password" autoComplete="new-password" />
      <p className="text-xs text-[var(--foreground-muted)]">At least 8 characters.</p>

      <FormMessage state={state} />

      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
