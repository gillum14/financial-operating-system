"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";

import { supabaseEnv } from "@/lib/supabase-env";
import { resolveSafeRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  message?: string;
  email?: string;
};

const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";

function isRateLimited(error: AuthError): boolean {
  return error.status === 429;
}

// Never render a raw Supabase/provider error to the user, and never log
// anything from `formData` (which may contain a password) — only the
// error's own status/code/message, which Supabase's AuthError never
// populates with credentials or tokens.
function logAuthError(context: string, error: unknown) {
  if (error instanceof Error) {
    console.error(`[auth:${context}]`, error.message);
  } else {
    console.error(`[auth:${context}] unknown error`);
  }
}

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export async function login(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logAuthError("login", error);
    if (isRateLimited(error)) {
      return { error: RATE_LIMIT_MESSAGE };
    }
    // One generic message for wrong password, unknown email, and
    // unconfirmed email alike — differentiating any of these would let an
    // attacker learn which emails have accounts.
    return { error: "Invalid email or password. If you just signed up, confirm your email first." };
  }

  const redirectTo = resolveSafeRedirect(formData.get("redirectTo") as string | null);
  redirect(redirectTo);
}

const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const SIGNUP_CONFIRMATION_MESSAGE = "Check your email to confirm your account before signing in.";

export async function signup(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${supabaseEnv.SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    logAuthError("signup", error);
    if (isRateLimited(error)) {
      return { error: RATE_LIMIT_MESSAGE };
    }
    if (error.code === "weak_password") {
      // About the attempted password itself, not about account existence —
      // safe to be specific. Checked by error.code, not status alone:
      // Supabase uses 422 broadly (including for "user already
      // registered"), so the status code on its own isn't a reliable
      // signal and could accidentally leak which case occurred.
      return { error: "Choose a stronger password (at least 8 characters)." };
    }
    // Any other failure, including "user already registered" (Supabase may
    // or may not surface this explicitly depending on project settings) —
    // always the same generic confirmation message, never a distinct
    // "this email is taken" response.
    return { message: SIGNUP_CONFIRMATION_MESSAGE, email: parsed.data.email };
  }

  return { message: SIGNUP_CONFIRMATION_MESSAGE, email: parsed.data.email };
}

const forgotPasswordSchema = z.object({ email: emailSchema });

const RESET_REQUEST_MESSAGE = "If an account exists for that email, we've sent a password reset link.";

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    // Even a format-invalid email gets the same generic message —
    // otherwise "valid format but unknown" vs "invalid format" responses
    // could themselves become a distinguishing signal.
    return { message: RESET_REQUEST_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${supabaseEnv.SITE_URL}/auth/callback?next=/reset-password`,
  });

  if (error) {
    logAuthError("forgot-password", error);
    if (isRateLimited(error)) {
      return { error: RATE_LIMIT_MESSAGE };
    }
    // Deliberately not distinguishing "unknown email" from any other
    // failure here either — always the same message.
  }

  return { message: RESET_REQUEST_MESSAGE };
}

const resetPasswordSchema = z.object({ password: passwordSchema });

export async function resetPassword(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a stronger password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    logAuthError("reset-password", error);
    if (isRateLimited(error)) {
      return { error: RATE_LIMIT_MESSAGE };
    }
    // A missing/expired recovery session lands here too (updateUser
    // requires one) — one generic message covers both cases.
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  redirect("/login");
}

export async function resendConfirmation(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z.object({ email: emailSchema }).safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { message: SIGNUP_CONFIRMATION_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data.email });

  if (error) {
    logAuthError("resend-confirmation", error);
    if (isRateLimited(error)) {
      return { error: RATE_LIMIT_MESSAGE };
    }
  }

  return { message: SIGNUP_CONFIRMATION_MESSAGE };
}
