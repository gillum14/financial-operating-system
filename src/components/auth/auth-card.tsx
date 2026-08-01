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
        <Link href="/" className="mb-4 flex items-center gap-2">
          <Image
            src="/images/logo/athena-icon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <span className="text-sm font-semibold tracking-[0.08em] text-[var(--foreground)]">ATHENA</span>
        </Link>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--foreground-muted)]">{subtitle}</p>}
      </div>

      {children}

      {footer && <div className="mt-6 text-center text-sm text-[var(--foreground-muted)]">{footer}</div>}
    </section>
  );
}
