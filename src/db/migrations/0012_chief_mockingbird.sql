ALTER TABLE "goals" ADD COLUMN "priority" text DEFAULT 'medium' NOT NULL;
--> statement-breakpoint

-- ============================================================================
-- Grant UPDATE on the new priority column — same incremental-grant pattern
-- as 0007_add_categories_sort_order.sql/0008_grant_categories_sort_order.sql:
-- the column-level UPDATE grant list on "goals" (from 0010_dry_titania.sql)
-- predates this column and must be extended explicitly, since granting on
-- a table does not retroactively cover columns added after the original
-- GRANT statement ran.
-- ============================================================================

GRANT UPDATE ("priority") ON "goals" TO authenticated;