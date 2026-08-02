"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

import Dialog from "@/components/ui/dialog";
import { getAccountPresentation } from "@/application/dashboard/account-presentation";
import { ACCOUNT_TYPES } from "@/domains/accounts/types";
import type { InstitutionOption } from "@/application/accounts/accounts-views";
import { createAccount } from "@/features/accounts/actions";
import { useServerAction } from "@/lib/actions/use-action";

const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPES.map((value) => ({
  value,
  label: getAccountPresentation(value).label,
}));

function AddAccountForm({ institutions, onDone }: { institutions: InstitutionOption[]; onDone: () => void }) {
  const create = useServerAction(createAccount);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const institutionId = formData.get("institutionId");
        const currentBalance = formData.get("currentBalance");

        create.run(
          {
            name: formData.get("name"),
            accountType: formData.get("accountType"),
            institutionId: institutionId ? institutionId : undefined,
            currentBalance: currentBalance ? currentBalance : undefined,
          },
          onDone,
        );
      }}
    >
      <div>
        <label htmlFor="account-name" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
          Account name
        </label>
        <input
          id="account-name"
          name="name"
          type="text"
          required
          maxLength={200}
          placeholder="Everyday Checking"
          className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="account-type" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
          Account type
        </label>
        <select
          id="account-type"
          name="accountType"
          required
          defaultValue=""
          className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        >
          <option value="" disabled>
            Select a type…
          </option>
          {ACCOUNT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="account-institution"
          className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]"
        >
          Institution (optional)
        </label>
        <select
          id="account-institution"
          name="institutionId"
          defaultValue=""
          className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        >
          <option value="">No institution</option>
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="account-balance" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
          Starting balance (optional)
        </label>
        <input
          id="account-balance"
          name="currentBalance"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      {create.error && (
        <div role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          <p>{create.error.message}</p>
          {create.error.fieldErrors && (
            <ul className="mt-1 list-inside list-disc">
              {Object.entries(create.error.fieldErrors).map(([field, messages]) => (
                <li key={field}>{messages.join(" ")}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={create.isPending}
        className="w-full rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        {create.isPending ? "Adding account…" : "Add account"}
      </button>
    </form>
  );
}

export function AddAccountControl({ institutions }: { institutions: InstitutionOption[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
        className="flex items-center gap-2 rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Add account
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Add account options"
          className="absolute right-0 z-10 mt-1 w-56 overflow-hidden rounded-[calc(var(--radius)-4px)] border border-[var(--border)] bg-[var(--surface-elevated)] py-1 text-sm shadow-[var(--shadow-md)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setDialogOpen(true);
            }}
            className="block w-full px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
          >
            Add manual account
          </button>
          {/* TECH DEBT: Plaid/provider linking isn't implemented — see Known
              Deviations in the delivery report. Shown disabled rather than
              omitted, since the trigger's chevron implies more than one
              option in the approved mockup. */}
          <span
            role="menuitem"
            aria-disabled="true"
            className="block cursor-not-allowed px-3 py-2 text-left text-[var(--foreground-muted)] opacity-70"
          >
            Connect a bank account (coming soon)
          </span>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Add account">
        <AddAccountForm institutions={institutions} onDone={() => setDialogOpen(false)} />
      </Dialog>
    </div>
  );
}
