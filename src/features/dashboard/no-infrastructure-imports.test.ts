import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Structural guard for the Slice 9 composition-root boundary: presentation
// components (the dashboard feature components and the shared ui/charts
// primitives they compose) must reach the database only through
// src/composition, never by importing src/infrastructure or src/db
// directly. This walks the actual source files rather than asserting
// against a hardcoded list, so it stays true as components are added.
const FORBIDDEN_IMPORT_PATTERN = /from\s+["']@\/(infrastructure|db)(\/|["'])/;

const PRESENTATION_DIRS = [
  path.resolve(import.meta.dirname, "components"),
  path.resolve(import.meta.dirname, "../../components/ui"),
  path.resolve(import.meta.dirname, "../../components/charts"),
];

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) return collectSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

describe("dashboard presentation components", () => {
  it("never import src/infrastructure or src/db directly", () => {
    const offenders = PRESENTATION_DIRS.flatMap(collectSourceFiles).filter((file) =>
      FORBIDDEN_IMPORT_PATTERN.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
