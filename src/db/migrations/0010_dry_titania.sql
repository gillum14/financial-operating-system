CREATE TABLE "goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"contribution_date" date NOT NULL,
	"note" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"category_id" uuid,
	"account_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"target_amount" numeric(19, 4) NOT NULL,
	"target_date" date,
	"goal_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"icon" text,
	"color" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goal_contributions_owner_id_idx" ON "goal_contributions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "goal_contributions_goal_id_idx" ON "goal_contributions" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goals_owner_id_idx" ON "goals" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "goals_owner_status_idx" ON "goals" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "goals_category_id_idx" ON "goals" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "goals_account_id_idx" ON "goals" USING btree ("account_id");
--> statement-breakpoint

-- ============================================================================
-- Row Level Security — goals, goal_contributions
-- ============================================================================
-- Same trust-boundary facts as 0003_row_level_security.sql /
-- 0009_add_budgets.sql apply unchanged: the trusted server (Drizzle/
-- DATABASE_URL) has BYPASSRLS, so ownership scoping for the application's
-- own queries remains enforced at the repository layer regardless of what's
-- below; this governs only the authenticated-JWT Data API path. (select
-- auth.uid()) is used throughout for the same InitPlan-once-per-statement
-- reason as every existing policy. Column-level UPDATE grants are combined
-- into this same migration for the same reason as 0009: the mutable-column
-- set is already fully known from this table's own application-layer
-- update schemas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- public.goals
-- ---------------------------------------------------------------------------

ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "goals" FROM anon, authenticated;
GRANT SELECT, INSERT ON "goals" TO authenticated;
-- status/completed_at change only through the dedicated lifecycle methods
-- (completeGoal/archiveGoal); every other column here is a regular editable
-- field while the goal isn't archived (see GoalService.EDITABLE_STATUSES).
-- display_order is deliberately excluded — it's server-computed once at
-- create time and no application code path ever updates it afterward (see
-- GoalUpdateInput's field set in domains/goals/types.ts).
GRANT UPDATE (
  "title", "description", "target_amount", "target_date", "goal_type",
  "status", "icon", "color", "completed_at", "category_id", "account_id"
) ON "goals" TO authenticated;
-- No DELETE grant: goals are preserved history, never hard-deleted — the
-- task's explicit requirement ("no permanent delete"). Removal is the
-- Archived lifecycle state, an UPDATE, not a DELETE.

DROP POLICY IF EXISTS "goals_select_own" ON "goals";
CREATE POLICY "goals_select_own" ON "goals"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "goals_insert_own" ON "goals";
CREATE POLICY "goals_insert_own" ON "goals"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "goals_update_own" ON "goals";
CREATE POLICY "goals_update_own" ON "goals"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- public.goal_contributions — the immutable historical record of a goal's
-- funding (see goals.ts's schema comment). Unlike
-- budget_allocation_adjustments this table DOES get an UPDATE grant/policy
-- (edit contribution is an explicit task workflow), but never a DELETE
-- grant — removal is always soft-delete (UPDATE deleted_at), so every
-- contribution ever recorded remains permanently in the table.
-- ---------------------------------------------------------------------------

ALTER TABLE "goal_contributions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "goal_contributions" FROM anon, authenticated;
GRANT SELECT, INSERT ON "goal_contributions" TO authenticated;
-- goal_id/source are immutable once a contribution exists — "changing"
-- which goal a contribution funds is remove + add, not an edit. deleted_at
-- is deliberately excluded from this grant (same convention as every other
-- owned table) — soft-delete happens through the trusted server connection,
-- which bypasses RLS entirely; this grant governs only the authenticated-
-- JWT Data API path.
GRANT UPDATE ("amount", "contribution_date", "note") ON "goal_contributions" TO authenticated;

DROP POLICY IF EXISTS "goal_contributions_select_own" ON "goal_contributions";
CREATE POLICY "goal_contributions_select_own" ON "goal_contributions"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "goal_contributions_insert_own" ON "goal_contributions";
CREATE POLICY "goal_contributions_insert_own" ON "goal_contributions"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "goal_contributions_update_own" ON "goal_contributions";
CREATE POLICY "goal_contributions_update_own" ON "goal_contributions"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));