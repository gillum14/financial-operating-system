import Link from "next/link";

import { resolveSafeRedirect } from "@/lib/auth/redirect";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = resolveSafeRedirect(params.redirectTo);

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to Athena."
      footer={
        <>
          <Link href="/forgot-password" className="text-[var(--primary)] hover:underline">
            Forgot your password?
          </Link>
          <span className="mx-2">·</span>
          <Link href="/signup" className="text-[var(--primary)] hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {params.error === "invalid_link" && (
        <p
          role="alert"
          className="mb-4 rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
        >
          That link is invalid or has expired. Please try again.
        </p>
      )}
      <LoginForm redirectTo={redirectTo} />
    </AuthCard>
  );
}
