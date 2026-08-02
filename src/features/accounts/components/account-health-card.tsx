import { ShieldQuestion } from "lucide-react";

import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card-header";

// TECH DEBT: connection health (age, reconnect deadlines, provider sync
// status) is entirely a Plaid-integration concept — accounts has no link
// to data_provider_connections today, and no provider integration exists
// in this codebase yet. The approved mockup's "Reconnect by [date]"
// warning and "Manage connection" button are not backed by any real
// signal, so implementing them would fabricate connection health that
// doesn't exist. This renders the mockup's card shell honestly empty,
// with the action disabled, instead.
export function AccountHealthCard() {
  return (
    <Card>
      <CardHeader title="Account health" />

      <div className="flex flex-col items-center justify-center rounded-[calc(var(--radius)-8px)] border border-dashed border-[var(--border)] px-6 py-8 text-center">
        <ShieldQuestion className="h-6 w-6 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-[var(--foreground-secondary)]">
          Connection health monitoring isn&apos;t available yet
        </p>
        <p className="mt-1 max-w-xs text-xs text-[var(--foreground-muted)]">
          This requires a provider connection integration that hasn&apos;t been built.
        </p>
        <button
          type="button"
          disabled
          title="Not yet available"
          className="mt-4 cursor-not-allowed rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
        >
          Manage connection
        </button>
      </div>
    </Card>
  );
}
