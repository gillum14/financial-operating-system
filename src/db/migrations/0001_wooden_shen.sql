-- drizzle-kit generate emitted a "CREATE TABLE auth.users" statement here
-- because it doesn't know that table already exists (it's a real Supabase-
-- managed table; src/db/schema/auth-users.ts is only a minimal stub so
-- Drizzle can build the foreign key below). That statement has been
-- removed by hand — running it would fail against any real Supabase
-- project since auth.users already exists with a much larger column set.

-- Migration implication for existing development seed data: prior to this
-- slice, `npm run db:seed` inserted a public.users row directly (fixed id
-- 00000000-0000-0000-0000-000000000001) with no corresponding auth.users
-- row, because Supabase Auth wasn't wired up yet. That row (and everything
-- owned by it) cannot satisfy the new foreign key below — there is no real
-- auth user behind it — so it must be removed before the constraint can be
-- added. This only ever touches that one well-known, exclusively-synthetic
-- dev UUID; a real Supabase Auth user id can never collide with it. Going
-- forward, seed data must be attached to a real auth user via SEED_OWNER_ID
-- (see src/db/seed/data.ts and README).
DELETE FROM "transactions" WHERE "owner_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
DELETE FROM "data_provider_connections" WHERE "owner_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
DELETE FROM "accounts" WHERE "owner_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
DELETE FROM "categories" WHERE "owner_id" = '00000000-0000-0000-0000-000000000001' AND "parent_category_id" IS NOT NULL;--> statement-breakpoint
DELETE FROM "categories" WHERE "owner_id" = '00000000-0000-0000-0000-000000000001' AND "parent_category_id" IS NULL;--> statement-breakpoint
DELETE FROM "users" WHERE "id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE restrict ON UPDATE no action;
