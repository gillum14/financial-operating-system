"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Category } from "@/domains/categories/types";
import { deleteCategory } from "@/features/categories/actions";
import { useServerAction } from "@/lib/actions/use-action";

// "Archive" is a label over the existing soft-delete — Categories have no
// separate archived-status column (deletedAt is the one lifecycle marker;
// see categories-model.md § Category Lifecycle), and there is no restore
// path in this slice (see actions.ts's deleteCategory comment).
export function CategoryRowMenu({
  category,
  onEdit,
  subcategoryCount = 0,
  transactionCount,
}: {
  category: Category;
  onEdit: () => void;
  // Only meaningful for top-level rows — a subcategory can never have its
  // own children (two-level hierarchy), so callers pass 0 for those.
  subcategoryCount?: number;
  transactionCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const archive = useServerAction(deleteCategory);

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

  function handleEdit() {
    setOpen(false);
    onEdit();
  }

  function handleArchiveClick() {
    setOpen(false);
    archive.reset();
    setConfirmOpen(true);
  }

  function handleConfirmArchive() {
    archive.run({ categoryId: category.id }, () => setConfirmOpen(false));
  }

  // Checked client-side, from data the row already has, so the dialog can
  // explain *why* up front instead of the user finding out only after
  // clicking Confirm and getting a generic server error back — the
  // server-side ConflictError in CategoryService.deleteCategory still
  // stands as the real enforcement, this is purely a friendlier first line
  // of defense against attempting something that's already known to fail.
  const blockReason =
    subcategoryCount > 0
      ? `"${category.name}" still has ${subcategoryCount} active ${subcategoryCount === 1 ? "subcategory" : "subcategories"}. Move or archive ${subcategoryCount === 1 ? "it" : "them"} first.`
      : transactionCount > 0
        ? `"${category.name}" is used by ${transactionCount} ${transactionCount === 1 ? "transaction" : "transactions"} and can't be archived while those references exist.`
        : null;

  return (
    <div ref={containerRef} className="relative inline-block shrink-0 text-left">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${category.name}`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${category.name}`}
          className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-[calc(var(--radius)-4px)] border border-[var(--border)] bg-[var(--surface-elevated)] py-1 text-sm shadow-[var(--shadow-md)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleEdit}
            className="block w-full px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleArchiveClick}
            className="block w-full px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
          >
            Archive
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Archive category"
        confirmLabel="Archive"
        onConfirm={handleConfirmArchive}
        isConfirming={archive.isPending}
        confirmDisabled={Boolean(blockReason)}
        destructive
      >
        {blockReason ? (
          <p>{blockReason}</p>
        ) : (
          <p>
            Archive <strong className="text-[var(--foreground)]">{category.name}</strong>? It will no longer appear
            when categorizing transactions, but existing historical data stays linked and intact.
          </p>
        )}

        {archive.error && (
          <p role="alert" className="mt-3 rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
            {archive.error.message}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
