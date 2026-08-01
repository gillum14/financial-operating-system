"use client";

import { useActionState } from "react";

import { requestPasswordReset, type AuthActionState } from "../actions";
import { FormField, FormMessage } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  if (state.message) {
    return <FormMessage state={state} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormField id="email" label="Email" type="email" autoComplete="email" />

      <FormMessage state={state} />

      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
