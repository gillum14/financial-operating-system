"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { createCategory } from "@/features/categories/actions";
import { useServerAction } from "@/lib/actions/use-action";

// Combines the mockup's "Enter subcategory name" input and its
// "+ Add Subcategory" button into a single inline control at one position
// (trigger collapses into the input on click) — the mockup originally
// split these across two columns; the annotated screenshot asked for them
// to live together instead.
export function AddSubcategoryInline({ parentCategoryId }: { parentCategoryId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { run, isPending, error, reset } = useServerAction(createCategory);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    run({ name: trimmed, parentCategoryId }, () => {
      setName("");
      setOpen(false);
    });
  }

  function handleCancel() {
    setOpen(false);
    setName("");
    reset();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 py-2.5 pl-7 text-left text-sm font-medium text-[var(--primary)] hover:underline"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
        Add Subcategory
      </button>
    );
  }

  return (
    <div className="py-2.5 pl-7">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          autoFocus
          required
          maxLength={200}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter subcategory name"
          className="min-w-0 flex-1 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="shrink-0 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
        >
          Cancel
        </button>
      </form>

      {error && (
        <div role="alert" className="mt-1.5 rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
          <p>{error.message}</p>
          {error.fieldErrors && (
            <ul className="mt-1 list-inside list-disc">
              {Object.entries(error.fieldErrors).map(([field, messages]) => (
                <li key={field}>{messages.join(" ")}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
