CREATE TABLE "goal_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "goal_allocations" ADD CONSTRAINT "goal_allocations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_allocations" ADD CONSTRAINT "goal_allocations_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_allocations" ADD CONSTRAINT "goal_allocations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goal_allocations_owner_id_idx" ON "goal_allocations" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "goal_allocations_goal_id_idx" ON "goal_allocations" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_allocations_account_id_idx" ON "goal_allocations" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_allocations_goal_account_active_idx" ON "goal_allocations" USING btree ("goal_id","account_id") WHERE deleted_at IS NULL;
--> statement-breakpoint

-- ============================================================================
-- ADR-0003 Goal Allocation Model: "One Dollar May Only Be Allocated Once" /
-- "Overallocation Is Prohibited" — enforced here at the database layer, not
-- solely in application code, so the invariant holds under concurrent
-- writes and regardless of which connection (trusted server or an
-- authenticated-JWT Data API call) performs the write. This is the
-- authoritative guarantee; GoalService.allocateFunds/editAllocation
-- perform the same check proactively first purely to surface a friendlier
-- ConflictError instead of a raw trigger exception in the common case.
--
-- A BEFORE INSERT OR UPDATE trigger (not a CHECK constraint, which Postgres
-- cannot express across multiple rows) — for each row being written,
-- SELECT ... FOR UPDATE locks the referenced account row for the rest of
-- the transaction, so two concurrent transactions allocating against the
-- same account are serialized: the second cannot read a stale "sum of
-- existing allocations" until the first commits or rolls back, exactly the
-- "smallest architecture-consistent transactional solution" this
-- invariant needs.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_goal_allocation_no_overallocation()
RETURNS TRIGGER AS $$
DECLARE
  v_balance numeric(19, 4);
  v_other_sum numeric(19, 4);
BEGIN
  -- Removals (soft-delete) and already-deleted rows never over-allocate —
  -- only a row that is (or is becoming) active needs this check.
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT current_balance INTO v_balance
  FROM accounts
  WHERE id = NEW.account_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'goal_allocations_no_balance: account % has no current_balance set and cannot fund a goal', NEW.account_id;
  END IF;

  -- NEW.id is already populated by the time a BEFORE trigger runs (column
  -- defaults, including gen_random_uuid(), resolve before BEFORE triggers
  -- fire) — id <> NEW.id correctly excludes this row's own prior value on
  -- both INSERT and UPDATE.
  SELECT COALESCE(SUM(amount), 0) INTO v_other_sum
  FROM goal_allocations
  WHERE account_id = NEW.account_id
    AND deleted_at IS NULL
    AND id <> NEW.id;

  IF v_other_sum + NEW.amount > v_balance THEN
    RAISE EXCEPTION 'goal_allocations_overallocation: allocating % would exceed the % available balance for account % (already allocated: %)',
      NEW.amount, v_balance, NEW.account_id, v_other_sum;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS goal_allocations_no_overallocation ON "goal_allocations";
CREATE TRIGGER goal_allocations_no_overallocation
  BEFORE INSERT OR UPDATE ON "goal_allocations"
  FOR EACH ROW
  EXECUTE FUNCTION check_goal_allocation_no_overallocation();

-- ---------------------------------------------------------------------------
-- public.goal_allocations — RLS, same trust-boundary facts and
-- (select auth.uid()) InitPlan-once convention as every prior migration.
-- ---------------------------------------------------------------------------

ALTER TABLE "goal_allocations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "goal_allocations" FROM anon, authenticated;
GRANT SELECT, INSERT ON "goal_allocations" TO authenticated;
-- goal_id/account_id are immutable once an allocation exists — "changing"
-- which goal or account an allocation targets is remove + add, not an
-- edit, matching budget_allocations' equivalent immutability.
GRANT UPDATE ("amount") ON "goal_allocations" TO authenticated;
-- No DELETE grant: removal is soft-delete (UPDATE deleted_at), consistent
-- with every other owned table in this schema.

DROP POLICY IF EXISTS "goal_allocations_select_own" ON "goal_allocations";
CREATE POLICY "goal_allocations_select_own" ON "goal_allocations"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "goal_allocations_insert_own" ON "goal_allocations";
CREATE POLICY "goal_allocations_insert_own" ON "goal_allocations"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "goal_allocations_update_own" ON "goal_allocations";
CREATE POLICY "goal_allocations_update_own" ON "goal_allocations"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));