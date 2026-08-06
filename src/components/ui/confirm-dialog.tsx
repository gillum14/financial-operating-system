"use client";

import type { ReactNode } from "react";

import Dialog from "./dialog";

// A generic confirm/cancel shell on top of the existing Dialog primitive —
// first built for Categories' archive confirmation, reusable anywhere a
// destructive or hard-to-reverse action needs an explicit second step
// (see the "Executing actions with care" guidance this app follows: pause
// before anything hard to reverse or visible to a shared record).
export function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  onConfirm,
  isConfirming = false,
  confirmDisabled = false,
  destructive = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  isConfirming?: boolean;
  // True when the action is currently unsafe (e.g. blocked by active
  // subcategories or transaction references) — the confirm button is
  // disabled rather than hidden, so the explanation in `children` stays
  // visible next to a button that visibly can't be pressed.
  confirmDisabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="text-sm text-[var(--foreground-secondary)]">{children}</div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming || confirmDisabled}
            className={`rounded-[calc(var(--radius)-8px)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${
              destructive ? "bg-[var(--danger)]" : "bg-[var(--primary)]"
            }`}
          >
            {isConfirming ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
