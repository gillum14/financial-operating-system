CREATE TABLE "account_balance_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"balance" numeric(19, 4) NOT NULL,
	"account_type" text NOT NULL,
	"balance_source" text NOT NULL,
	"snapshot_type" text DEFAULT 'monthly' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_balance_snapshots" ADD CONSTRAINT "account_balance_snapshots_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_balance_snapshots" ADD CONSTRAINT "account_balance_snapshots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_balance_snapshots_owner_id_idx" ON "account_balance_snapshots" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "account_balance_snapshots_account_id_idx" ON "account_balance_snapshots" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_balance_snapshots_owner_date_idx" ON "account_balance_snapshots" USING btree ("owner_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "account_balance_snapshots_account_date_idx" ON "account_balance_snapshots" USING btree ("account_id","snapshot_date");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- public.account_balance_snapshots — RLS, same trust-boundary facts and
-- (select auth.uid()) InitPlan-once convention as every prior migration.
--
-- This table is genuinely immutable: no UPDATE grant, no UPDATE policy, no
-- DELETE grant, no DELETE policy. Unlike goal_allocations (which has a
-- legitimate "edit the amount" workflow) a balance snapshot has no
-- legitimate post-creation edit path in this V1 — net-worth-model.md §19
-- is explicit that Athena must never modify historical snapshots, and
-- there is no soft-delete column for ordinary users to rewrite via either.
-- A capture is INSERT-only, made idempotent by the unique index above
-- (ON CONFLICT DO NOTHING at the application layer), not by allowing an
-- overwrite.
-- ---------------------------------------------------------------------------

ALTER TABLE "account_balance_snapshots" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "account_balance_snapshots" FROM anon, authenticated;
GRANT SELECT, INSERT ON "account_balance_snapshots" TO authenticated;

DROP POLICY IF EXISTS "account_balance_snapshots_select_own" ON "account_balance_snapshots";
CREATE POLICY "account_balance_snapshots_select_own" ON "account_balance_snapshots"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "account_balance_snapshots_insert_own" ON "account_balance_snapshots";
CREATE POLICY "account_balance_snapshots_insert_own" ON "account_balance_snapshots"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));