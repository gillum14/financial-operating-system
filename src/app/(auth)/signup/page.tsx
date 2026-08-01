import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Start tracking your finances with Athena."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
