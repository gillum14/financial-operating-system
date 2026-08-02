-- ============================================================================
-- Harden UPDATE grants on owned tables to column-level
-- ============================================================================
-- 0003_row_level_security.sql granted table-level UPDATE (all columns) to
-- authenticated on accounts/categories/transactions/data_provider_connections.
-- The RLS WITH CHECK on owner_id already blocks ownership reassignment, but
-- id, owner_id, created_at, updated_at, and deleted_at were still nominally
-- writable at the grant level — RLS is row-scoped and can't restrict which
-- *columns* a permitted UPDATE touches. This closes that gap the same way
-- 0003 already did for users.display_name: a column-level GRANT.
--
-- The allowed column list per table is not a new judgment call — it is
-- exactly the field set each table's own application-layer update schema
-- already permits (e.g. AccountService's updateAccountSchema), so
-- "legitimate mutable columns required by user-context operations" has one
-- authoritative source of truth rather than being redefined here.
--
-- id, owner_id, created_at, updated_at, and deleted_at are excluded from
-- every grant below:
--   * id, owner_id: identity and ownership must never be user-writable.
--   * created_at, deleted_at: system/lifecycle-managed — deleted_at in
--     particular is the soft-delete marker, only ever written by the
--     trusted server's own soft-delete path today.
--   * updated_at: the application never lets a caller set this directly
--     either (every repository sets it itself: `{...changes, updatedAt:
--     new Date()}`) — so it stays out of the authenticated-role grant too,
--     rather than letting a Data API caller forge it. If a real
--     authenticated-role write path is built later, add a BEFORE UPDATE
--     trigger to auto-set updated_at rather than granting it directly.
-- ============================================================================

REVOKE UPDATE ON "accounts" FROM authenticated;
GRANT UPDATE (
  "institution_id", "name", "account_type", "masked_account_number", "currency",
  "status", "balance_source", "current_balance", "opening_date", "closing_date", "notes"
) ON "accounts" TO authenticated;

REVOKE UPDATE ON "categories" FROM authenticated;
GRANT UPDATE ("name", "parent_category_id") ON "categories" TO authenticated;

REVOKE UPDATE ON "transactions" FROM authenticated;
GRANT UPDATE (
  "category_id", "transaction_date", "posting_date", "original_description",
  "merchant", "amount", "transaction_type", "is_excluded", "notes"
) ON "transactions" TO authenticated;

REVOKE UPDATE ON "data_provider_connections" FROM authenticated;
GRANT UPDATE (
  "institution_id", "provider_name", "external_reference", "status", "connected_at"
) ON "data_provider_connections" TO authenticated;
