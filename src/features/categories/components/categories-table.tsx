"use client";

import { Fragment, type DragEvent } from "react";
import { ChevronDown, ChevronUp, CornerDownRight, GripVertical, Info } from "lucide-react";

import type { SubcategoryRow, TopLevelCategoryRow } from "@/application/categories/categories-views";
import type { Category } from "@/domains/categories/types";
import { resolveCategoryColor } from "@/lib/category-color";

import { AddSubcategoryInline } from "./add-subcategory-inline";
import { CategoryRowMenu } from "./category-row-menu";

export function CategoriesTable({
  rows,
  isExpanded,
  onToggleExpand,
  onEdit,
  onEditSubcategory,
  draggedTopLevelId,
  onTopLevelDragStart,
  onTopLevelDrop,
  onTopLevelDragEnd,
  draggingSubcategoryId,
  onSubcategoryDragStart,
  onSubcategoryDrop,
  onSubcategoryDragEnd,
}: {
  rows: TopLevelCategoryRow[];
  isExpanded: (id: string) => boolean;
  onToggleExpand: (id: string) => void;
  onEdit: (category: Category, hasSubcategories: boolean) => void;
  onEditSubcategory: (subcategory: Category) => void;
  draggedTopLevelId: string | null;
  onTopLevelDragStart: (id: string) => void;
  onTopLevelDrop: (id: string) => void;
  onTopLevelDragEnd: () => void;
  draggingSubcategoryId: string | null;
  onSubcategoryDragStart: (parentId: string, subcategoryId: string) => void;
  onSubcategoryDrop: (parentId: string, subcategoryId: string) => void;
  onSubcategoryDragEnd: () => void;
}) {
  function allowDrop(event: DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-xs font-semibold tracking-[0.08em] text-[var(--foreground-muted)] uppercase">
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Subcategories</th>
            <th className="px-4 py-3 text-center font-semibold">
              <span className="inline-flex items-center gap-1.5">
                Transactions
                <Info
                  className="h-3.5 w-3.5 normal-case"
                  strokeWidth={1.75}
                  aria-label="Includes excluded transactions"
                />
              </span>
            </th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row) => {
            const hasSubcategories = row.subcategories.length > 0;
            const expanded = isExpanded(row.category.id);

            return (
              <Fragment key={row.category.id}>
                <tr
                  draggable
                  onDragStart={() => onTopLevelDragStart(row.category.id)}
                  onDragOver={allowDrop}
                  onDrop={() => onTopLevelDrop(row.category.id)}
                  onDragEnd={onTopLevelDragEnd}
                  className={`transition-opacity ${draggedTopLevelId === row.category.id ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 cursor-grab text-[var(--foreground-muted)]" aria-hidden="true">
                        <GripVertical className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: resolveCategoryColor(row.category) }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate font-medium text-[var(--foreground)]">{row.category.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {hasSubcategories ? (
                      <button
                        type="button"
                        onClick={() => onToggleExpand(row.category.id)}
                        aria-label={expanded ? `Collapse ${row.category.name}` : `Expand ${row.category.name}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        {row.subcategories.length}
                        {expanded ? (
                          <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                      </button>
                    ) : (
                      <span className="text-[var(--foreground-muted)]" aria-hidden="true">
                        —
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center text-sm text-[var(--foreground-secondary)]">{row.transactionCount}</td>

                  <td className="px-4 py-3 text-right">
                    <CategoryRowMenu category={row.category} onEdit={() => onEdit(row.category, hasSubcategories)} />
                  </td>
                </tr>

                {expanded &&
                  row.subcategories.map((sub: SubcategoryRow) => (
                    <tr
                      key={sub.category.id}
                      draggable
                      onDragStart={() => onSubcategoryDragStart(row.category.id, sub.category.id)}
                      onDragOver={allowDrop}
                      onDrop={() => onSubcategoryDrop(row.category.id, sub.category.id)}
                      onDragEnd={onSubcategoryDragEnd}
                      className={`transition-opacity ${draggingSubcategoryId === sub.category.id ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3 pl-7">
                          <span className="shrink-0 cursor-grab text-[var(--foreground-muted)]" aria-hidden="true">
                            <GripVertical className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </span>
                          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-[var(--foreground-muted)]" strokeWidth={1.75} aria-hidden="true" />
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: resolveCategoryColor(sub.category) }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 truncate text-[var(--foreground-secondary)]">{sub.category.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--foreground-muted)]" aria-hidden="true">
                        —
                      </td>
                      <td className="px-4 py-2.5 text-center text-sm text-[var(--foreground-secondary)]">{sub.transactionCount}</td>
                      <td className="px-4 py-2.5 text-right">
                        <CategoryRowMenu category={sub.category} onEdit={() => onEditSubcategory(sub.category)} />
                      </td>
                    </tr>
                  ))}

                {expanded && (
                  <tr>
                    <td colSpan={4} className="px-4 py-0">
                      <AddSubcategoryInline parentCategoryId={row.category.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
