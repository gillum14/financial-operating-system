import type { ReactNode } from "react";

export type BadgeTone = "success" | "warning" | "danger" | "primary" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-[var(--success)]/15 text-[var(--success)]",
  warning: "bg-[var(--warning)]/15 text-[var(--warning)]",
  danger: "bg-[var(--danger)]/15 text-[var(--danger)]",
  primary: "bg-[var(--primary)]/15 text-[var(--primary)]",
  neutral: "bg-[var(--surface-hover)] text-[var(--foreground-secondary)]",
};

export default function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
