import { AuthCard } from "@/components/auth/auth-card";

import { ResetPasswordForm } from "./reset-password-form";

// Deliberately not under (auth) — completing the email recovery link
// establishes a real (temporary, recovery-scoped) Supabase session, which
// would make (auth)'s "already authenticated -> redirect to /dashboard"
// layout logic bounce the user away before they could actually reset
// anything. If someone lands here without a valid recovery session, the
// resetPassword action itself fails with a generic "invalid or expired
// link" message — no separate page-level gate is needed.
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12 text-[var(--foreground)]">
      <div className="w-full max-w-sm">
        <AuthCard title="Set a new password">
          <ResetPasswordForm />
        </AuthCard>
      </div>
    </div>
  );
}
