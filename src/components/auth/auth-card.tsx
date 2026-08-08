import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
      <div className="mb-6 flex flex-col items-center text-center">
        <Link href="/" className="mb-2 flex items-center gap-2">
          <Image
            src="/images/logo/mocal-icon.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
          />
          <span className="text-sm font-semibold tracking-[0.08em] text-[var(--foreground)]">MOCAL</span>
        </Link>
        <p className="mb-4 text-[10px] font-medium tracking-[0.12em] text-[var(--foreground-muted)] uppercase">
          Your Financial Operating System
        </p>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--foreground-muted)]">{subtitle}</p>}
      </div>

      {children}

      {footer && <div className="mt-6 text-center text-sm text-[var(--foreground-muted)]">{footer}</div>}
    </section>
  );
}
