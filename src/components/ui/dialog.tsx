"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // "md" (default, max-w-md) matches every existing caller exactly — "lg"
  // is for content that needs real width (e.g. a scrollable list), never
  // the default so no existing dialog silently changes size.
  size?: "md" | "lg";
};

const SIZE_CLASSES: Record<NonNullable<DialogProps["size"]>, string> = {
  md: "max-w-md",
  lg: "max-w-2xl",
};

// Native <dialog> rather than a hand-rolled portal/overlay: it gives focus
// trapping, Escape-to-close, and the top-layer/::backdrop stacking for
// free, with no new dependency (no Radix/Headless UI in this project).
export default function Dialog({ open, onClose, title, children, size = "md" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        // A click that lands on the <dialog> element itself (not a
        // descendant) is a backdrop click.
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      // m-auto: native <dialog> centers itself via the UA stylesheet's
      // `margin: auto` on `dialog:modal`, but Tailwind's preflight reset
      // zeroes every element's margin — without this, the dialog renders
      // pinned to the fixed-position default (top-left) instead of
      // centered in the viewport.
      className={`fixed inset-0 m-auto ${SIZE_CLASSES[size]} h-fit w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] shadow-[var(--shadow-md)] backdrop:bg-black/60`}
    >
      <div className="mb-5 flex items-start justify-between">
        <h2 id="dialog-title" className="text-lg font-semibold text-[var(--foreground)]">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {children}
    </dialog>
  );
}
