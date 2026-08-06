ALTER TABLE "categories" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Backfill: give every existing row a sort_order consistent with its
-- current implicit (creation) order, scoped to (owner_id, parent_category_id)
-- — the same scope CategoryService uses for "append to end of sibling
-- group" and for reorderCategories — so this migration doesn't visibly
-- reshuffle anyone's existing category list the first time sortOrder-aware
-- ordering is applied.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY owner_id, parent_category_id
    ORDER BY created_at, id
  ) - 1 AS rn
  FROM "categories"
)
UPDATE "categories"
SET sort_order = ranked.rn
FROM ranked
WHERE "categories".id = ranked.id;