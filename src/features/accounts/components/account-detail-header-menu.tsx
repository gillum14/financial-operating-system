"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import type { AccountStatus } from "@/domains/accounts/types";
import { archiveAccount, restoreAccount } from "@/features/accounts/actions";
import { useServerAction } from "@/lib/actions/use-action";

export function AccountDetailHeaderMenu({
  accountId,
  accountStatus,
}: {
  accountId: string;
  accountStatus: AccountStatus;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const archive = useServerAction(archiveAccount);
  const restore = useServerAction(restoreAccount);
  const pendingAction = archive.isPending || restore.isPending;
  const activeError = archive.error ?? restore.error;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account actions"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account actions"
          className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-[calc(var(--radius)-4px)] border border-[var(--border)] bg-[var(--surface-elevated)] py-1 text-sm shadow-[var(--shadow-md)]"
        >
          {accountStatus === "active" ? (
            <button
              type="button"
              role="menuitem"
              disabled={pendingAction}
              onClick={() => {
                setOpen(false);
                archive.run({ accountId });
              }}
              className="block w-full px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {archive.isPending ? "Archiving…" : "Archive account"}
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              disabled={pendingAction}
              onClick={() => {
                setOpen(false);
                restore.run({ accountId });
              }}
              className="block w-full px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {restore.isPending ? "Restoring…" : "Restore account"}
            </button>
          )}
        </div>
      )}

      {activeError && (
        <p
          role="alert"
          className="absolute right-0 z-10 mt-1 w-56 rounded-[calc(var(--radius)-4px)] bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]"
        >
          {activeError.message}
        </p>
      )}
    </div>
  );
}
