// Most call sites (Transactions' pills, its spending summary's bars, the
// Reports spending breakdown) only ever have a category *name* on hand,
// not the full row — this cycles through the app's chart palette, keyed by
// name, so the same category still renders the same color everywhere,
// without a real per-category color. Categories themselves do have a real,
// user-settable `color` column now (see resolveCategoryColor below); this
// hash is the fallback for a category with no color set, and the only
// option anywhere that doesn't have the full row to check.
const CATEGORY_TONES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function categoryTone(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_TONES[hash % CATEGORY_TONES.length];
}

// The fixed swatch set offered by the Add/Edit Category color picker —
// matches the approved mockup (blue, green, orange, pink, purple, yellow,
// gray). A category's stored `color` is validated against this list server
// -side too (see createCategorySchema in application/categories/service.ts),
// so every stored color is guaranteed to be one of these, never arbitrary
// user-supplied CSS.
export const CATEGORY_COLOR_OPTIONS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#ec4899",
  "#a855f7",
  "#eab308",
  "#6b7280",
] as const;

export type CategoryColorOption = (typeof CATEGORY_COLOR_OPTIONS)[number];

// The color to render for a category row: its own stored color if it has
// one, otherwise the same deterministic name-hash fallback used everywhere
// else in the app that only has a name to go on.
export function resolveCategoryColor(category: { name: string; color: string | null }): string {
  return category.color ?? categoryTone(category.name);
}
