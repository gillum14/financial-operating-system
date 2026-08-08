CREATE TABLE "confidence_score_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"overall_score" integer,
	"band" text,
	"pillar_scores" jsonb NOT NULL,
	"snapshot_type" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "confidence_score_snapshots" ADD CONSTRAINT "confidence_score_snapshots_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "confidence_score_snapshots_owner_id_idx" ON "confidence_score_snapshots" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "confidence_score_snapshots_owner_date_idx" ON "confidence_score_snapshots" USING btree ("owner_id","snapshot_date");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- public.confidence_score_snapshots — RLS, same trust-boundary facts and
-- (select auth.uid()) InitPlan-once convention as every prior migration.
--
-- This table is genuinely immutable, same as account_balance_snapshots: no
-- UPDATE grant, no UPDATE policy, no DELETE grant, no DELETE policy. A
-- Confidence Score snapshot has no legitimate post-creation edit path — a
-- capture is INSERT-only, made idempotent by the unique index above
-- (ON CONFLICT DO NOTHING at the application layer), not by allowing an
-- overwrite.
-- ---------------------------------------------------------------------------

ALTER TABLE "confidence_score_snapshots" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "confidence_score_snapshots" FROM anon, authenticated;
GRANT SELECT, INSERT ON "confidence_score_snapshots" TO authenticated;

DROP POLICY IF EXISTS "confidence_score_snapshots_select_own" ON "confidence_score_snapshots";
CREATE POLICY "confidence_score_snapshots_select_own" ON "confidence_score_snapshots"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "confidence_score_snapshots_insert_own" ON "confidence_score_snapshots";
CREATE POLICY "confidence_score_snapshots_insert_own" ON "confidence_score_snapshots"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));