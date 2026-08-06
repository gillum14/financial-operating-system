-- ============================================================================
-- Extend the categories column-level UPDATE grant to sort_order
-- ============================================================================
-- 0006_grant_categories_color_description.sql extended the authenticated
-- role's UPDATE grant on categories to name/parent_category_id/color/
-- description. sort_order is now also a real, user-driven mutable column
-- (set by CategoryService.reorderCategories and appended-to-end on
-- create/move — see updateCategoryInputSchema equivalents in
-- src/features/categories/actions.ts), so the grant is extended again to
-- match — keeping "the allowed column list is exactly the field set the
-- application-layer schema permits" true.
-- ============================================================================

REVOKE UPDATE ON "categories" FROM authenticated;
GRANT UPDATE ("name", "parent_category_id", "color", "description", "sort_order") ON "categories" TO authenticated;
