import { describe, expect, it } from "vitest";

import { evaluateDbTestGuard } from "./db-test-guard";

// Pure unit tests — no real database connection, no environment
// dependency. These exist specifically to prove the guard behaves exactly
// as documented in docs/testing.md, since the guard is the primary
// safeguard added after the 2026-08-06 data-loss incident: it must fail
// closed (refuse) whenever any required condition is missing, not just in
// the happy path.
describe("evaluateDbTestGuard", () => {
  it("refuses when ALLOW_DB_TESTS is unset", () => {
    const result = evaluateDbTestGuard({});

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/ALLOW_DB_TESTS/);
  });

  it("refuses when ALLOW_DB_TESTS is set to anything other than the literal string 'true'", () => {
    const result = evaluateDbTestGuard({ ALLOW_DB_TESTS: "1" });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/ALLOW_DB_TESTS/);
  });

  it("refuses when ALLOW_DB_TESTS is true but TEST_DATABASE_URL is unset", () => {
    const result = evaluateDbTestGuard({ ALLOW_DB_TESTS: "true" });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/TEST_DATABASE_URL/);
  });

  it("refuses when TEST_DATABASE_URL matches DATABASE_URL and the override is not set", () => {
    const result = evaluateDbTestGuard({
      ALLOW_DB_TESTS: "true",
      TEST_DATABASE_URL: "postgresql://same",
      DATABASE_URL: "postgresql://same",
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/identical/);
  });

  it("refuses when TEST_DATABASE_URL matches DATABASE_URL even if the override is set to something other than 'true'", () => {
    const result = evaluateDbTestGuard({
      ALLOW_DB_TESTS: "true",
      TEST_DATABASE_URL: "postgresql://same",
      DATABASE_URL: "postgresql://same",
      ALLOW_DB_TESTS_AGAINST_DEV_DATABASE: "yes",
    });

    expect(result.allowed).toBe(false);
  });

  it("allows when TEST_DATABASE_URL matches DATABASE_URL and the override is explicitly 'true'", () => {
    const result = evaluateDbTestGuard({
      ALLOW_DB_TESTS: "true",
      TEST_DATABASE_URL: "postgresql://same",
      DATABASE_URL: "postgresql://same",
      ALLOW_DB_TESTS_AGAINST_DEV_DATABASE: "true",
    });

    expect(result.allowed).toBe(true);
    expect(result.connectionString).toBe("postgresql://same");
  });

  it("allows when TEST_DATABASE_URL is a genuinely separate connection, without needing the override", () => {
    const result = evaluateDbTestGuard({
      ALLOW_DB_TESTS: "true",
      TEST_DATABASE_URL: "postgresql://test-db",
      DATABASE_URL: "postgresql://dev-db",
    });

    expect(result.allowed).toBe(true);
    expect(result.connectionString).toBe("postgresql://test-db");
  });

  it("allows when TEST_DATABASE_URL is set and DATABASE_URL is entirely unset", () => {
    const result = evaluateDbTestGuard({
      ALLOW_DB_TESTS: "true",
      TEST_DATABASE_URL: "postgresql://test-db",
    });

    expect(result.allowed).toBe(true);
  });

  it("never returns a connection string when refusing", () => {
    const blocked = [
      evaluateDbTestGuard({}),
      evaluateDbTestGuard({ ALLOW_DB_TESTS: "true" }),
      evaluateDbTestGuard({
        ALLOW_DB_TESTS: "true",
        TEST_DATABASE_URL: "postgresql://same",
        DATABASE_URL: "postgresql://same",
      }),
    ];

    for (const result of blocked) {
      expect(result.allowed).toBe(false);
      expect(result.connectionString).toBeUndefined();
    }
  });
});
