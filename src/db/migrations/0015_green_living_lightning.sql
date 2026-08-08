CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"mission_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"related_goal_id" uuid,
	"related_account_id" uuid,
	"related_budget_period_id" uuid,
	"related_transaction_ids" jsonb,
	"start_value" numeric(19, 4),
	"target_value" numeric(19, 4),
	"target_band_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_related_goal_id_goals_id_fk" FOREIGN KEY ("related_goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_related_account_id_accounts_id_fk" FOREIGN KEY ("related_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_related_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("related_budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "missions_owner_id_idx" ON "missions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "missions_owner_status_idx" ON "missions" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "missions_related_goal_id_idx" ON "missions" USING btree ("related_goal_id");--> statement-breakpoint
CREATE INDEX "missions_related_account_id_idx" ON "missions" USING btree ("related_account_id");--> statement-breakpoint
CREATE INDEX "missions_related_budget_period_id_idx" ON "missions" USING btree ("related_budget_period_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- public.missions — RLS, same trust-boundary facts and
-- (select auth.uid()) InitPlan-once convention as every prior migration.
--
-- Only status/completed_at ever change after a mission is started — every
-- other column (mission_type, title, description, the related_* snapshot,
-- start_value/target_value/target_band_id) is captured once, at start
-- time, and never edited afterward; there is no "edit mission" workflow.
-- No DELETE grant: a mission is preserved history, never hard-deleted —
-- removal is the Archived lifecycle state (an UPDATE), matching every
-- other owned table in this schema (goals, budget_periods, ...).
-- ---------------------------------------------------------------------------

ALTER TABLE "missions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "missions" FROM anon, authenticated;
GRANT SELECT, INSERT ON "missions" TO authenticated;
GRANT UPDATE ("status", "completed_at") ON "missions" TO authenticated;

DROP POLICY IF EXISTS "missions_select_own" ON "missions";
CREATE POLICY "missions_select_own" ON "missions"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "missions_insert_own" ON "missions";
CREATE POLICY "missions_insert_own" ON "missions"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "missions_update_own" ON "missions";
CREATE POLICY "missions_update_own" ON "missions"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));