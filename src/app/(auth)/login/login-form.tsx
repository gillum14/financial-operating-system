"use client";

import { useActionState } from "react";

import { login, type AuthActionState } from "../actions";
import { FormField, FormMessage } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <FormField id="email" label="Email" type="email" autoComplete="email" />
      <FormField id="password" label="Password" type="password" autoComplete="current-password" />

      <FormMessage state={state} />

      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
