-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Applies to: public.users, public.accounts, public.categories,
-- public.transactions, public.data_provider_connections, public.institutions
--
-- READ THIS BEFORE MODIFYING ANYTHING BELOW.
--
-- Two separate trust boundaries exist in this system:
--
--   1. Trusted server (Drizzle / DATABASE_URL): connects as the `postgres`
--      role, which OWNS every table below and has BYPASSRLS. Enabling RLS
--      has NO EFFECT on this path whatsoever — ownership scoping for the
--      application's own queries continues to be enforced entirely at the
--      repository layer (owner-scoped WHERE clauses), exactly as before
--      this migration. A passing application test against this connection
--      is never proof that RLS works.
--
--   2. User-context Supabase access (authenticated JWT -> Data API /
--      PostgREST -> `authenticated` role): this is what RLS governs. The
--      application does not use this path for data today (only for Auth
--      itself), but it must be secure by default the moment anything does.
--
-- RLS policies only apply to operations a role already has a plain SQL
-- GRANT for — policies can only further RESTRICT rows within an operation
-- that's already permitted, never grant an operation on their own. As of
-- this migration, anon/authenticated had ZERO SELECT/INSERT/UPDATE/DELETE
-- grants on any of these tables (verified against the live database), so
-- explicit grants below are required, not optional.
--
-- Every policy predicate uses (select auth.uid()) — wrapping auth.uid() in
-- a scalar subselect lets Postgres evaluate it once per statement (via an
-- InitPlan) instead of once per row, which is Supabase's own documented
-- performance guidance for RLS policies at any meaningful table size.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- public.users
-- ---------------------------------------------------------------------------

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "users" FROM anon, authenticated;
GRANT SELECT ON "users" TO authenticated;
-- Column-level grant: authenticated users may update display_name only.
-- This reinforces the WITH CHECK policy below at a level RLS itself can't
-- reach (RLS filters rows, not columns) — id, email, deleted_at, and any
-- future system/privileged field remain untouchable by this role no
-- matter what a crafted request's payload contains.
GRANT UPDATE ("display_name") ON "users" TO authenticated;
-- No INSERT grant or policy: profile creation is exclusively the
-- handle_new_user trigger's job (SECURITY DEFINER, runs as its owner —
-- see 0002_handle_new_user_trigger.sql), never a direct authenticated-user
-- action.
-- No DELETE grant or policy: account closure is a future controlled
-- workflow (see docs/architecture/security-architecture.md), not
-- something an authenticated user can trigger directly today.

DROP POLICY IF EXISTS "users_select_own" ON "users";
CREATE POLICY "users_select_own" ON "users"
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "users_update_own" ON "users";
CREATE POLICY "users_update_own" ON "users"
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- public.accounts
-- ---------------------------------------------------------------------------

ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "accounts" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON "accounts" TO authenticated;
-- No DELETE grant or policy: the application only ever soft-deletes
-- (UPDATE deleted_at); direct DELETE is not required today, so it is not
-- granted at all — narrowest safe policy, per the approved principles.

DROP POLICY IF EXISTS "accounts_select_own" ON "accounts";
CREATE POLICY "accounts_select_own" ON "accounts"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "accounts_insert_own" ON "accounts";
CREATE POLICY "accounts_insert_own" ON "accounts"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "accounts_update_own" ON "accounts";
CREATE POLICY "accounts_update_own" ON "accounts"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- public.categories
-- ---------------------------------------------------------------------------

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "categories" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON "categories" TO authenticated;

DROP POLICY IF EXISTS "categories_select_own" ON "categories";
CREATE POLICY "categories_select_own" ON "categories"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "categories_insert_own" ON "categories";
CREATE POLICY "categories_insert_own" ON "categories"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "categories_update_own" ON "categories";
CREATE POLICY "categories_update_own" ON "categories"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- public.transactions
-- ---------------------------------------------------------------------------

ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "transactions" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON "transactions" TO authenticated;

DROP POLICY IF EXISTS "transactions_select_own" ON "transactions";
CREATE POLICY "transactions_select_own" ON "transactions"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "transactions_insert_own" ON "transactions";
CREATE POLICY "transactions_insert_own" ON "transactions"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "transactions_update_own" ON "transactions";
CREATE POLICY "transactions_update_own" ON "transactions"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- public.data_provider_connections
-- ---------------------------------------------------------------------------

ALTER TABLE "data_provider_connections" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "data_provider_connections" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON "data_provider_connections" TO authenticated;

DROP POLICY IF EXISTS "data_provider_connections_select_own" ON "data_provider_connections";
CREATE POLICY "data_provider_connections_select_own" ON "data_provider_connections"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "data_provider_connections_insert_own" ON "data_provider_connections";
CREATE POLICY "data_provider_connections_insert_own" ON "data_provider_connections"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "data_provider_connections_update_own" ON "data_provider_connections";
CREATE POLICY "data_provider_connections_update_own" ON "data_provider_connections"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- public.institutions — shared reference data, not user-owned.
-- USING (true) is intentional here (unlike the owned tables above): every
-- authenticated user may read the shared institution list, but none may
-- write to it — maintenance is a trusted-server-only concern, enforced by
-- granting no INSERT/UPDATE/DELETE to authenticated at all.
-- ---------------------------------------------------------------------------

ALTER TABLE "institutions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "institutions" FROM anon, authenticated;
GRANT SELECT ON "institutions" TO authenticated;

DROP POLICY IF EXISTS "institutions_select_authenticated" ON "institutions";
CREATE POLICY "institutions_select_authenticated" ON "institutions"
  FOR SELECT
  TO authenticated
  USING (true);
