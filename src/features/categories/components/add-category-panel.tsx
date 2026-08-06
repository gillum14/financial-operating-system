"use client";

import { useState, type FormEvent } from "react";

import { RailCard } from "@/components/ui/rail-card";
import { createCategory } from "@/features/categories/actions";
import { useServerAction } from "@/lib/actions/use-action";
import { CATEGORY_COLOR_OPTIONS, type CategoryColorOption } from "@/lib/category-color";

import { ColorSwatchPicker } from "./color-swatch-picker";
import type { ParentOption } from "./category-form-dialog";

const DESCRIPTION_MAX_LENGTH = 100;

// A persistent right-rail create form, matching the approved mockup, in
// place of a header-triggered modal — the only way to create a top-level
// category. Editing an existing category still goes through
// CategoryFormDialog (a modal), opened from a row's "Edit" action.
export function AddCategoryPanel({ parentOptions }: { parentOptions: ParentOption[] }) {
  const [name, setName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [color, setColor] = useState<CategoryColorOption>(CATEGORY_COLOR_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const { run, isPending, error } = useServerAction(createCategory);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    run(
      {
        name: trimmedName,
        parentCategoryId: parentCategoryId || undefined,
        color,
        description: description.trim() || undefined,
      },
      () => {
        setName("");
        setParentCategoryId("");
        setColor(CATEGORY_COLOR_OPTIONS[0]);
        setDescription("");
      },
    );
  }

  return (
    <RailCard title="Add Category">
      <p className="-mt-1 mb-3 text-xs text-[var(--foreground-muted)]">Create a new category or subcategory.</p>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="rail-category-parent" className="mb-1 block text-xs font-medium text-[var(--foreground-secondary)]">
            Parent Category (optional)
          </label>
          <select
            id="rail-category-parent"
            value={parentCategoryId}
            onChange={(event) => setParentCategoryId(event.target.value)}
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="">None (Top-level Category)</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rail-category-name" className="mb-1 block text-xs font-medium text-[var(--foreground-secondary)]">
            Category Name
          </label>
          <input
            id="rail-category-name"
            type="text"
            required
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter category name"
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <ColorSwatchPicker value={color} onChange={setColor} idPrefix="rail-category" />

        <div>
          <label htmlFor="rail-category-description" className="mb-1 block text-xs font-medium text-[var(--foreground-secondary)]">
            Description (optional)
          </label>
          <textarea
            id="rail-category-description"
            rows={3}
            maxLength={DESCRIPTION_MAX_LENGTH}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Enter description (optional)"
            className="w-full resize-none rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-[var(--foreground-muted)]">
            {description.length} / {DESCRIPTION_MAX_LENGTH}
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
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

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create Category"}
        </button>
      </form>
    </RailCard>
  );
}
