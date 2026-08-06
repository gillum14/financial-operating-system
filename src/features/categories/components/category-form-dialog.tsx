"use client";

import { useState, type FormEvent } from "react";

import Dialog from "@/components/ui/dialog";
import type { Category } from "@/domains/categories/types";
import { createCategory, updateCategory } from "@/features/categories/actions";
import { useServerAction } from "@/lib/actions/use-action";
import { CATEGORY_COLOR_OPTIONS, type CategoryColorOption } from "@/lib/category-color";

import { ColorSwatchPicker } from "./color-swatch-picker";

export interface ParentOption {
  id: string;
  name: string;
}

const DESCRIPTION_MAX_LENGTH = 100;

function isCategoryColorOption(value: string | null | undefined): value is CategoryColorOption {
  return (CATEGORY_COLOR_OPTIONS as readonly string[]).includes(value ?? "");
}

export function CategoryFormDialog({
  open,
  onClose,
  category,
  hasSubcategories = false,
  parentOptions,
  initialParentId,
}: {
  open: boolean;
  onClose: () => void;
  // null means "create a new category"; a Category means "edit this one".
  category: Category | null;
  // True when `category` already has its own subcategories — see the
  // parentPickerDisabled comment below.
  hasSubcategories?: boolean;
  // Top-level categories only — the two-level hierarchy means a
  // subcategory can never itself be a valid parent option.
  parentOptions: ParentOption[];
  // Pre-selects (and, when set from the inline "Add Subcategory" row,
  // locks) the parent — used when creating a subcategory directly under a
  // known category, so the user isn't asked to re-pick what they already
  // told the row they wanted.
  initialParentId?: string | null;
}) {
  const isEdit = category !== null;
  const [name, setName] = useState(category?.name ?? "");
  const [parentCategoryId, setParentCategoryId] = useState(initialParentId ?? category?.parentCategoryId ?? "");
  const [color, setColor] = useState<CategoryColorOption>(
    isCategoryColorOption(category?.color) ? category.color : CATEGORY_COLOR_OPTIONS[0],
  );
  const [description, setDescription] = useState(category?.description ?? "");

  const create = useServerAction(createCategory);
  const update = useServerAction(updateCategory);
  const { isPending, error } = isEdit ? update : create;

  // A top-level category that already has subcategories can't safely be
  // re-parented under another category — the service only validates the
  // *new* parent's own depth, not whether the category being moved
  // already has children of its own, so doing this could quietly produce
  // a three-level hierarchy the service was never meant to allow.
  // Guarded here, at the UI layer, rather than letting a user hit
  // whatever the service happens to do with that combination.
  const parentPickerDisabled = Boolean(initialParentId) || (isEdit && hasSubcategories);

  const availableParents = category ? parentOptions.filter((option) => option.id !== category.id) : parentOptions;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (isEdit) {
      update.run(
        {
          categoryId: category.id,
          name: trimmedName,
          // Explicit null (not undefined) when the picker is set to "None"
          // — that's what tells CategoryService this is really a request
          // to clear the parent, not just a field the client didn't touch.
          // See the schema comment in features/categories/actions.ts.
          parentCategoryId: parentCategoryId || null,
          color,
          description: description.trim() || undefined,
        },
        onClose,
      );
    } else {
      create.run(
        {
          name: trimmedName,
          parentCategoryId: parentCategoryId || undefined,
          color,
          description: description.trim() || undefined,
        },
        onClose,
      );
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Edit Category" : "Add Category"}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="category-parent" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Parent Category (optional)
          </label>
          <select
            id="category-parent"
            value={parentCategoryId}
            onChange={(event) => setParentCategoryId(event.target.value)}
            disabled={parentPickerDisabled}
            title={
              isEdit && hasSubcategories
                ? "This category has subcategories and can't be moved under another category"
                : undefined
            }
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">None (Top-level Category)</option>
            {availableParents.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category-name" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Category Name
          </label>
          <input
            id="category-name"
            type="text"
            required
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter category name"
            className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <ColorSwatchPicker value={color} onChange={setColor} idPrefix="category-dialog" />

        <div>
          <label htmlFor="category-description" className="mb-1.5 block text-sm font-medium text-[var(--foreground-secondary)]">
            Description (optional)
          </label>
          <textarea
            id="category-description"
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
          <div role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
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

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-[calc(var(--radius)-8px)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving…" : isEdit ? "Save changes" : "Create Category"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
