import { defineConfig } from "drizzle-kit";

// MIGRATION_DATABASE_URL, when set, takes priority over DATABASE_URL —
// migrations (drizzle-kit generate/migrate) are administrative/DDL
// operations that run better over a direct, non-pooled connection (port
// 5432) than through the app's pooled PgBouncer connection (see
// docs/testing.md § Data-loss incident for the risk class this avoids).
// Optional: unset, this falls back to DATABASE_URL exactly as before.
const databaseUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL (or MIGRATION_DATABASE_URL) is required to run Drizzle Kit commands.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
});
