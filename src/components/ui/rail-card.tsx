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
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
