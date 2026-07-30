import { ReactNode } from "react";

type CardHeaderProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export default function CardHeader({ title, subtitle, children }: CardHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>

        {subtitle && <p className="mt-1 text-sm text-[var(--foreground-muted)]">{subtitle}</p>}
      </div>

      {children}
    </div>
  );
}
