import "server-only";

import { z } from "zod";

// Temporary development-only scaffolding: resolves "the current owner" from a
// fixed environment variable instead of a real session, because Supabase
// Auth has not been implemented yet (see docs/architecture/security-architecture.md).
// This is NOT authentication and must never determine authorization in
// production. It is isolated in this single file so it has exactly one
// deletion point once real auth exists — callers should treat
// resolveDevelopmentOwnerId() as the whole contract and never read
// DEVELOPMENT_OWNER_ID directly.
// General UUID shape (8-4-4-4-12 hex), not the stricter RFC4122
// version/variant check zod's built-in `.uuid()` applies — this project's
// seed data (src/db/seed/data.ts) intentionally uses sequential,
// non-version-compliant fixed UUIDs (e.g. "...-0000-000000000001") for
// readability, and Postgres's uuid column type accepts that shape fine.
const developmentOwnerIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export function resolveDevelopmentOwnerId(): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "resolveDevelopmentOwnerId() is development-only scaffolding and refuses to run when " +
        "NODE_ENV=production. Replace this call with real authentication (Supabase Auth) before " +
        "deploying — see docs/architecture/security-architecture.md.",
    );
  }

  const raw = process.env.DEVELOPMENT_OWNER_ID;
  if (!raw) {
    throw new Error(
      "DEVELOPMENT_OWNER_ID is not set. Set it in your local .env to the id of a seeded user " +
        "(see src/db/seed/data.ts). This is temporary development scaffolding, not authentication.",
    );
  }

  const parsed = developmentOwnerIdSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("DEVELOPMENT_OWNER_ID must be a valid UUID.");
  }

  return parsed.data;
}
