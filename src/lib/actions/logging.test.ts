import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logActionError } from "./logging";

describe("logActionError", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the error name and message for validation/authentication/authorization/domain categories", () => {
    logActionError("createThing", "domain", new Error("Category abc-123 still has subcategories"), "corr-1");

    const logged = errorSpy.mock.calls[0]?.join(" ") ?? "";
    expect(logged).toContain("Error: Category abc-123 still has subcategories");
  });

  it("never logs the raw message for infrastructure errors, even when it contains sensitive values", () => {
    const dbError = new Error("Key (email)=(user@example.com) already exists");
    dbError.name = "DrizzleQueryError";

    logActionError("createUser", "infrastructure", dbError, "corr-2");

    const logged = errorSpy.mock.calls[0]?.join(" ") ?? "";
    expect(logged).not.toContain("user@example.com");
    expect(logged).toContain("DrizzleQueryError");
  });

  it("includes a safe SQLSTATE-style code for infrastructure errors when present, still no message", () => {
    const cause = Object.assign(new Error("duplicate key value violates unique constraint (secret-ish detail)"), {
      code: "23505",
    });
    const dbError = new Error("query failed", { cause });

    logActionError("createUser", "infrastructure", dbError, "corr-3");

    const logged = errorSpy.mock.calls[0]?.join(" ") ?? "";
    expect(logged).toContain("code=23505");
    expect(logged).not.toContain("secret-ish detail");
  });

  it("never logs the raw message for unexpected errors", () => {
    logActionError("weirdThing", "unexpected", new TypeError("Cannot read properties of undefined (reading 'x')"), "corr-4");

    const logged = errorSpy.mock.calls[0]?.join(" ") ?? "";
    expect(logged).not.toContain("Cannot read properties");
  });

  it("handles a non-Error thrown value safely", () => {
    expect(() => logActionError("thing", "unexpected", "raw string throw", "corr-5")).not.toThrow();
    const logged = errorSpy.mock.calls[0]?.join(" ") ?? "";
    expect(logged).toContain("non-error value thrown");
  });

  it("includes the action name, category, and correlationId in every log line", () => {
    logActionError("createThing", "validation", new Error("bad input"), "corr-6");

    const logged = errorSpy.mock.calls[0]?.join(" ") ?? "";
    expect(logged).toContain("[action:createThing]");
    expect(logged).toContain("[validation]");
    expect(logged).toContain("[corr-6]");
  });
});
