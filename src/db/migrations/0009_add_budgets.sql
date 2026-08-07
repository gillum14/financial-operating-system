CREATE TABLE "budget_allocation_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"budget_allocation_id" uuid NOT NULL,
	"previous_amount" numeric(19, 4) NOT NULL,
	"new_amount" numeric(19, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"budget_period_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"planned_amount" numeric(19, 4) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "budget_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "budget_allocation_adjustments" ADD CONSTRAINT "budget_allocation_adjustments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocation_adjustments" ADD CONSTRAINT "budget_allocation_adjustments_budget_allocation_id_budget_allocations_id_fk" FOREIGN KEY ("budget_allocation_id") REFERENCES "public"."budget_allocations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_allocation_adjustments_owner_id_idx" ON "budget_allocation_adjustments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "budget_allocation_adjustments_allocation_id_idx" ON "budget_allocation_adjustments" USING btree ("budget_allocation_id");--> statement-breakpoint
CREATE INDEX "budget_allocations_owner_id_idx" ON "budget_allocations" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "budget_allocations_period_id_idx" ON "budget_allocations" USING btree ("budget_period_id");--> statement-breakpoint
CREATE INDEX "budget_allocations_category_id_idx" ON "budget_allocations" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_allocations_period_category_active_idx" ON "budget_allocations" USING btree ("budget_period_id","category_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "budget_periods_owner_id_idx" ON "budget_periods" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "budget_periods_owner_status_idx" ON "budget_periods" USING btree ("owner_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_periods_one_active_per_owner_idx" ON "budget_periods" USING btree ("owner_id") WHERE status = 'active' AND deleted_at IS NULL;
--> statement-breakpoint

-- ============================================================================
-- Row Level Security — budget_periods, budget_allocations,
-- budget_allocation_adjustments
-- ============================================================================
-- Same trust-boundary facts as 0003_row_level_security.sql apply
-- unchanged: the trusted server (Drizzle/DATABASE_URL) has BYPASSRLS, so
-- ownership scoping for the application's own queries remains enforced at
-- the repository layer regardless of what's below; this governs only the
-- authenticated-JWT Data API path, which must be secure by default the
-- moment anything uses it. (select auth.uid()) is used throughout for the
-- same InitPlan-once-per-statement reason as every existing policy.
--
-- Column-level UPDATE grants are combined into this same migration rather
-- than a separate hardening follow-up (the 0004/0008 pattern) because the
-- mutable-column set is already fully known from this table's own
-- application-layer update schemas — no separate judgment call to defer.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- public.budget_periods
-- ---------------------------------------------------------------------------

ALTER TABLE "budget_periods" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "budget_periods" FROM anon, authenticated;
GRANT SELECT, INSERT ON "budget_periods" TO authenticated;
-- period_start/period_end are immutable once a period is created (to
-- change them, archive the period and create a new one — this avoids
-- having to re-validate overlap/active-period invariants on an edit
-- path). Only the lifecycle status transitions.
GRANT UPDATE ("status") ON "budget_periods" TO authenticated;
-- No DELETE grant: budget periods are preserved history, never hard-
-- deleted (budgets-model.md §20: "Athena must never... Lose adjustment
-- history" / "Allow orphaned budget categories" — the same posture
-- extends to periods themselves). Removal is the Archived lifecycle
-- state, an UPDATE, not a DELETE.

DROP POLICY IF EXISTS "budget_periods_select_own" ON "budget_periods";
CREATE POLICY "budget_periods_select_own" ON "budget_periods"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "budget_periods_insert_own" ON "budget_periods";
CREATE POLICY "budget_periods_insert_own" ON "budget_periods"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "budget_periods_update_own" ON "budget_periods";
CREATE POLICY "budget_periods_update_own" ON "budget_periods"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- public.budget_allocations
-- ---------------------------------------------------------------------------

ALTER TABLE "budget_allocations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "budget_allocations" FROM anon, authenticated;
GRANT SELECT, INSERT ON "budget_allocations" TO authenticated;
-- budget_period_id/category_id are immutable once an allocation exists —
-- "changing" which category an allocation targets is remove + add, not an
-- edit, so ambiguity about display_order/history never arises.
GRANT UPDATE ("planned_amount", "display_order") ON "budget_allocations" TO authenticated;
-- No DELETE grant: removal is soft-delete (UPDATE deleted_at), consistent
-- with every other owned table in this schema.

DROP POLICY IF EXISTS "budget_allocations_select_own" ON "budget_allocations";
CREATE POLICY "budget_allocations_select_own" ON "budget_allocations"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "budget_allocations_insert_own" ON "budget_allocations";
CREATE POLICY "budget_allocations_insert_own" ON "budget_allocations"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "budget_allocations_update_own" ON "budget_allocations";
CREATE POLICY "budget_allocations_update_own" ON "budget_allocations"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- public.budget_allocation_adjustments — immutable, insert-only audit log.
-- No UPDATE grant or policy at all, for anyone: not even the row's own
-- owner may modify an adjustment record once written.
-- ---------------------------------------------------------------------------

ALTER TABLE "budget_allocation_adjustments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "budget_allocation_adjustments" FROM anon, authenticated;
GRANT SELECT, INSERT ON "budget_allocation_adjustments" TO authenticated;

DROP POLICY IF EXISTS "budget_allocation_adjustments_select_own" ON "budget_allocation_adjustments";
CREATE POLICY "budget_allocation_adjustments_select_own" ON "budget_allocation_adjustments"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "budget_allocation_adjustments_insert_own" ON "budget_allocation_adjustments";
CREATE POLICY "budget_allocation_adjustments_insert_own" ON "budget_allocation_adjustments"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));