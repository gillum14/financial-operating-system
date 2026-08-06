"use client";

import { useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";

import type { CategoriesOverviewView, TopLevelCategoryRow as TopLevelCategoryRowModel } from "@/application/categories/categories-views";
import type { Category } from "@/domains/categories/types";
import { reorderCategories } from "@/features/categories/actions";
import { useServerAction } from "@/lib/actions/use-action";
import { RAIL_GRID_COLS } from "@/lib/page-grid";

import { AddCategoryPanel } from "./add-category-panel";
import { CategoriesHeader } from "./categories-header";
import { CategoriesSearch } from "./categories-search";
import { CategoriesSummaryTiles } from "./categories-summary-tiles";
import { CategoriesTable } from "./categories-table";
import { CategoryFormDialog, type ParentOption } from "./category-form-dialog";
import { QuickTipsCard } from "./quick-tips-card";

// Edit-only now — creating a top-level category happens through the
// persistent AddCategoryPanel in the rail, not this modal. `category` is
// always non-null when this is open (see onEdit/onEditSubcategory below).
type DialogState = { category: Category; hasSubcategories: boolean };

// `rows` moves optimistically on drop (instant visual feedback), then the
// same new order is persisted via reorderCategories — CategoryService
// verifies it's exactly the current sibling group before writing sortOrder
// (see service.ts). `rows` is also re-seeded from `overview` whenever the
// server view changes (e.g. after any mutation triggers
// revalidatePath("/categories")), so the real persisted order is always
// what a fresh page load shows, even if a reorder call is still in flight
// or happened to fail.
export function CategoriesWorkspace({ overview }: { overview: CategoriesOverviewView }) {
  const [rows, setRows] = useState<TopLevelCategoryRowModel[]>(overview.topLevelCategories);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [draggedTopLevelId, setDraggedTopLevelId] = useState<string | null>(null);
  const [draggedSubcategory, setDraggedSubcategory] = useState<{ parentId: string; id: string } | null>(null);
  const reorder = useServerAction(reorderCategories);

  // Re-seeds local (session-only) drag order from the server view during
  // render rather than in an effect — the React-recommended pattern for
  // resetting derived state when a prop changes, since adjusting state in
  // an effect body would cause an extra render pass.
  const [syncedOverview, setSyncedOverview] = useState(overview);
  if (overview !== syncedOverview) {
    setSyncedOverview(overview);
    setRows(overview.topLevelCategories);
  }

  const parentOptions: ParentOption[] = useMemo(
    () => rows.map((row) => ({ id: row.category.id, name: row.category.name })),
    [rows],
  );

  const query = search.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!query) return rows;
    return rows
      .map((row) => {
        const parentMatches = row.category.name.toLowerCase().includes(query);
        const matchingSubcategories = row.subcategories.filter((sub) => sub.category.name.toLowerCase().includes(query));
        if (parentMatches) return row;
        if (matchingSubcategories.length > 0) return { ...row, subcategories: matchingSubcategories };
        return null;
      })
      .filter((row): row is TopLevelCategoryRowModel => row !== null);
  }, [rows, query]);

  const autoExpandIds = useMemo(() => {
    if (!query) return new Set<string>();
    return new Set(
      rows
        .filter(
          (row) =>
            !row.category.name.toLowerCase().includes(query) &&
            row.subcategories.some((sub) => sub.category.name.toLowerCase().includes(query)),
        )
        .map((row) => row.category.id),
    );
  }, [rows, query]);

  function isExpanded(id: string) {
    return expandedIds.has(id) || autoExpandIds.has(id);
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleTopLevelDrop(targetId: string) {
    const sourceId = draggedTopLevelId;
    setDraggedTopLevelId(null);
    if (!sourceId || sourceId === targetId) return;

    const fromIndex = rows.findIndex((row) => row.category.id === sourceId);
    const toIndex = rows.findIndex((row) => row.category.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...rows];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setRows(next);

    reorder.run({ parentCategoryId: null, orderedCategoryIds: next.map((row) => row.category.id) });
  }

  function handleSubcategoryDrop(parentId: string, targetId: string) {
    const dragged = draggedSubcategory;
    setDraggedSubcategory(null);
    if (!dragged || dragged.parentId !== parentId || dragged.id === targetId) return;

    const parentRow = rows.find((row) => row.category.id === parentId);
    if (!parentRow) return;

    const fromIndex = parentRow.subcategories.findIndex((sub) => sub.category.id === dragged.id);
    const toIndex = parentRow.subcategories.findIndex((sub) => sub.category.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const nextSubcategories = [...parentRow.subcategories];
    const [moved] = nextSubcategories.splice(fromIndex, 1);
    nextSubcategories.splice(toIndex, 0, moved);

    setRows((prev) =>
      prev.map((row) => (row.category.id === parentId ? { ...row, subcategories: nextSubcategories } : row)),
    );

    reorder.run({ parentCategoryId: parentId, orderedCategoryIds: nextSubcategories.map((sub) => sub.category.id) });
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* Desktop content grid: (header + search + summary tiles + category
          list) + a narrow utility rail (Quick Tips, Add Category) as a
          true grid sibling — same RAIL_GRID_COLS pattern as Transactions/
          Budgets/Goals. The rail starts at the very top of the page,
          level with the title, rather than only alongside the list below
          it; rendered again at the stacked-below breakpoint so the two
          sites can't drift. */}
      <div className={`${RAIL_GRID_COLS} items-start`}>
        <div className="min-w-0 space-y-6">
          <CategoriesHeader />

          <CategoriesSearch value={search} onChange={setSearch} />

          <CategoriesSummaryTiles overview={overview} />

          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--foreground-secondary)]">
                <FolderOpen className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="mt-4 text-base font-semibold text-[var(--foreground)]">
                {rows.length === 0 ? "No categories yet" : "No categories match your search"}
              </p>
              <p className="mt-1 max-w-sm text-sm text-[var(--foreground-muted)]">
                {rows.length === 0
                  ? "Use the Add Category panel to create your first category."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <CategoriesTable
              rows={filteredRows}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpanded}
              onEdit={(category, hasSubcategories) => setDialogState({ category, hasSubcategories })}
              onEditSubcategory={(subcategory) => setDialogState({ category: subcategory, hasSubcategories: false })}
              draggedTopLevelId={draggedTopLevelId}
              onTopLevelDragStart={setDraggedTopLevelId}
              onTopLevelDrop={handleTopLevelDrop}
              onTopLevelDragEnd={() => setDraggedTopLevelId(null)}
              draggingSubcategoryId={draggedSubcategory?.id ?? null}
              onSubcategoryDragStart={(parentId, subcategoryId) => setDraggedSubcategory({ parentId, id: subcategoryId })}
              onSubcategoryDrop={handleSubcategoryDrop}
              onSubcategoryDragEnd={() => setDraggedSubcategory(null)}
            />
          )}

          {rows.length > 0 && (
            <p className="text-xs text-[var(--foreground-muted)]">Drag and drop categories or subcategories to reorder them.</p>
          )}

          {reorder.error && (
            <p role="alert" className="rounded-[calc(var(--radius)-8px)] bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
              Couldn&apos;t save that order: {reorder.error.message}
            </p>
          )}
        </div>

        <aside className="hidden space-y-4 min-[1360px]:block">
          <QuickTipsCard />
          <AddCategoryPanel parentOptions={parentOptions} />
        </aside>
      </div>

      <div className="space-y-4 min-[1360px]:hidden">
        <QuickTipsCard />
        <AddCategoryPanel parentOptions={parentOptions} />
      </div>

      {dialogState && (
        <CategoryFormDialog
          open
          onClose={() => setDialogState(null)}
          category={dialogState.category}
          hasSubcategories={dialogState.hasSubcategories}
          parentOptions={parentOptions}
        />
      )}
    </div>
  );
}
