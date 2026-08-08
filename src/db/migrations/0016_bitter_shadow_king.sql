CREATE TABLE "mission_progression" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"completed_mission_count" integer DEFAULT 0 NOT NULL,
	"last_qualifying_completion_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_progression_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
CREATE TABLE "mission_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"reward_key" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_xp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"base_xp" integer NOT NULL,
	"bonus_xp" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "difficulty" text;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "xp_value" numeric(10, 0);--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "is_daily_mission" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mission_progression" ADD CONSTRAINT "mission_progression_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_rewards" ADD CONSTRAINT "mission_rewards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_xp_events" ADD CONSTRAINT "mission_xp_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_xp_events" ADD CONSTRAINT "mission_xp_events_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mission_rewards_owner_id_idx" ON "mission_rewards" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_rewards_owner_reward_idx" ON "mission_rewards" USING btree ("owner_id","reward_key");--> statement-breakpoint
CREATE INDEX "mission_xp_events_owner_id_idx" ON "mission_xp_events" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_xp_events_mission_id_idx" ON "mission_xp_events" USING btree ("mission_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Backfill difficulty/xp_value for any mission rows that existed before the
-- Mission Progression System — as of this migration there is exactly one
-- (a real, in-progress "Stay Within Budget" mission on the canonical seed
-- owner, started by manual live testing, not a fixture). CASE covers every
-- MISSION_TYPES value for correctness regardless of what exists today,
-- mirroring MISSION_TYPE_DIFFICULTY in progression-calculations.ts exactly
-- — "custom" is intentionally left NULL (matches its no-difficulty design).
-- ---------------------------------------------------------------------------
UPDATE "missions"
SET
  "difficulty" = CASE "mission_type"
    WHEN 'categorize-transactions' THEN 'easy'
    WHEN 'stay-within-budget' THEN 'medium'
    WHEN 'reach-savings-goal' THEN 'medium'
    WHEN 'reduce-debt' THEN 'hard'
    WHEN 'improve-confidence' THEN 'hard'
    WHEN 'fund-emergency-fund' THEN 'major-milestone'
    ELSE NULL
  END,
  "xp_value" = CASE "mission_type"
    WHEN 'categorize-transactions' THEN 50
    WHEN 'stay-within-budget' THEN 100
    WHEN 'reach-savings-goal' THEN 100
    WHEN 'reduce-debt' THEN 200
    WHEN 'improve-confidence' THEN 200
    WHEN 'fund-emergency-fund' THEN 500
    WHEN 'custom' THEN 100
    ELSE 100
  END
WHERE "xp_value" IS NULL;
--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "xp_value" SET NOT NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- public.mission_progression — RLS, same trust-boundary facts and
-- (select auth.uid()) InitPlan-once convention as every prior migration.
-- Mutable (the one summary row per owner is updated on every completion),
-- so unlike the two immutable ledger tables below it gets an UPDATE grant
-- and policy — but still no DELETE grant: this row is never removed.
-- ---------------------------------------------------------------------------

ALTER TABLE "mission_progression" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "mission_progression" FROM anon, authenticated;
GRANT SELECT, INSERT ON "mission_progression" TO authenticated;
GRANT UPDATE ("total_xp", "current_streak", "longest_streak", "completed_mission_count", "last_qualifying_completion_date") ON "mission_progression" TO authenticated;

DROP POLICY IF EXISTS "mission_progression_select_own" ON "mission_progression";
CREATE POLICY "mission_progression_select_own" ON "mission_progression"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "mission_progression_insert_own" ON "mission_progression";
CREATE POLICY "mission_progression_insert_own" ON "mission_progression"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "mission_progression_update_own" ON "mission_progression";
CREATE POLICY "mission_progression_update_own" ON "mission_progression"
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- public.mission_xp_events — immutable, insert-only XP ledger, same
-- pattern as confidence_score_snapshots/account_balance_snapshots: no
-- UPDATE grant, no UPDATE policy, no DELETE grant, no DELETE policy. The
-- unique index on mission_id (see the CREATE TABLE above) is what actually
-- enforces "once per mission" — this RLS section only controls who can
-- read/write rows they own, not the uniqueness invariant itself.
-- ---------------------------------------------------------------------------

ALTER TABLE "mission_xp_events" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "mission_xp_events" FROM anon, authenticated;
GRANT SELECT, INSERT ON "mission_xp_events" TO authenticated;

DROP POLICY IF EXISTS "mission_xp_events_select_own" ON "mission_xp_events";
CREATE POLICY "mission_xp_events_select_own" ON "mission_xp_events"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "mission_xp_events_insert_own" ON "mission_xp_events";
CREATE POLICY "mission_xp_events_insert_own" ON "mission_xp_events"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- public.mission_rewards — immutable, insert-only unlock ledger. Same
-- shape as mission_xp_events: no UPDATE/DELETE grant or policy anywhere —
-- an unlocked reward is permanent (missions-model.md §18 Reward
-- Finality). The unique (owner_id, reward_key) index is what makes
-- re-checking eligibility after every completion idempotent.
-- ---------------------------------------------------------------------------

ALTER TABLE "mission_rewards" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "mission_rewards" FROM anon, authenticated;
GRANT SELECT, INSERT ON "mission_rewards" TO authenticated;

DROP POLICY IF EXISTS "mission_rewards_select_own" ON "mission_rewards";
CREATE POLICY "mission_rewards_select_own" ON "mission_rewards"
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "mission_rewards_insert_own" ON "mission_rewards";
CREATE POLICY "mission_rewards_insert_own" ON "mission_rewards"
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));