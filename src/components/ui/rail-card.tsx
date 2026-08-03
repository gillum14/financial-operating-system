import type { ReactNode } from "react";

// A compact utility-card shell for narrow right-rail layouts (first built
// for the Transactions page's utility rail) — deliberately lighter than
// the shared Card/CardHeader pair (p-6, text-lg title, mb-6 header gap),
// which is sized for full dashboard sections. Approved mockups' rail cards
// are narrow and dense; reusing Card there produced oversized panels that
// didn't match them.
export function RailCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        {/* min-w-0 lets this flex item shrink below its unwrapped text
            width — without it, a longer title (e.g. Retirement's
            "Retirement Income Breakdown") paired with an action doesn't
            wrap; it just crowds the action instead. Same fix as
            StatCard's label. */}
        <h3 className="min-w-0 text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
