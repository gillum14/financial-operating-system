"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { archiveAccount } from "@/features/accounts/actions";
import { useServerAction } from "@/lib/actions/use-action";

export function AccountRowMenu({ accountId, accountName }: { accountId: string; accountName: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const archive = useServerAction(archiveAccount);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleArchive() {
    setOpen(false);
    archive.run({ accountId });
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${accountName}`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${accountName}`}
          className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-[calc(var(--radius)-4px)] border border-[var(--border)] bg-[var(--surface-elevated)] py-1 text-sm shadow-[var(--shadow-md)]"
        >
          <Link
            href={`/accounts/${accountId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
          >
            View details
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={archive.isPending}
            onClick={handleArchive}
            className="block w-full px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {archive.isPending ? "Archiving…" : "Archive account"}
          </button>
        </div>
      )}

      {archive.error && (
        <p role="alert" className="absolute right-0 z-10 mt-1 w-56 rounded-[calc(var(--radius)-4px)] bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
          {archive.error.message}
        </p>
      )}
    </div>
  );
}
