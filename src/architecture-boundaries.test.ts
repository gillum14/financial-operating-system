import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(import.meta.dirname);

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) return collectSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") ? [fullPath] : [];
  });
}

const allSourceFiles = collectSourceFiles(SRC_ROOT);

// Server-only, database, or composition-root modules a browser bundle must
// never pull in — either directly (a leaked secret) or indirectly (an
// accidental infrastructure dependency in what should be a thin
// presentation component).
const FORBIDDEN_CLIENT_IMPORT_PATTERN =
  /from\s+["']@\/(db|infrastructure|composition|lib\/env|lib\/supabase-env|lib\/supabase\/server|lib\/auth\/authenticated-user)(\/|["'])/;

describe("architecture boundaries", () => {
  it("no \"use client\" file imports server-only, database, or composition-root modules", () => {
    const offenders = allSourceFiles.filter((file) => {
      const content = readFileSync(file, "utf8");
      const isClientComponent = content.trimStart().startsWith('"use client"');
      return isClientComponent && FORBIDDEN_CLIENT_IMPORT_PATTERN.test(content);
    });

    expect(offenders.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
  });

  it("no service-role client exists — this slice intentionally has none", () => {
    // Guards against one being added casually later without the same
    // deliberate "only if absolutely required" review this slice applied.
    const offenders = allSourceFiles.filter((file) => {
      const content = readFileSync(file, "utf8");
      return /SUPABASE_SERVICE_ROLE_KEY|service[-_]?role/i.test(content);
    });

    expect(offenders.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
  });

  it("development owner scaffolding was fully removed, not left dangling", () => {
    const offenders = allSourceFiles.filter((file) => {
      const content = readFileSync(file, "utf8");
      return /DEVELOPMENT_OWNER_ID|resolveDevelopmentOwnerId/.test(content);
    });

    expect(offenders.map((f) => path.relative(SRC_ROOT, f))).toEqual([]);
  });

  it("the dashboard page derives ownerId from requireAuthenticatedUser(), never from request params", () => {
    const pageSource = readFileSync(
      path.join(SRC_ROOT, "app/(authenticated)/dashboard/page.tsx"),
      "utf8",
    );

    expect(pageSource).toContain("requireAuthenticatedUser()");
    expect(pageSource).not.toMatch(/searchParams\.\w*[Oo]wner/);
    expect(pageSource).not.toMatch(/params\.\w*[Oo]wner/);
  });

  it("the authenticated layout is the authoritative gate for every route beneath it", () => {
    const layoutSource = readFileSync(path.join(SRC_ROOT, "app/(authenticated)/layout.tsx"), "utf8");

    expect(layoutSource).toContain("requireAuthenticatedUser()");
  });
});
