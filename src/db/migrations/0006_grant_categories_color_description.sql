-- ============================================================================
-- Extend the categories column-level UPDATE grant to color/description
-- ============================================================================
-- 0004_harden_owned_table_update_grants.sql restricted the authenticated
-- role's UPDATE on categories to exactly the columns the application-layer
-- update schema permitted at the time: name and parent_category_id. Now
-- that color and description are real, user-writable columns on categories
-- (see updateCategoryInputSchema in src/features/categories/actions.ts),
-- the grant is extended to match — keeping "the allowed column list is
-- exactly the field set the application-layer schema permits" true.
-- ============================================================================

REVOKE UPDATE ON "categories" FROM authenticated;
GRANT UPDATE ("name", "parent_category_id", "color", "description") ON "categories" TO authenticated;
