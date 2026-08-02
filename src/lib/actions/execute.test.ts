import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError, NotFoundError } from "@/domains/errors";

import { assertAuthorized } from "./authorize";
import { AuthenticationError } from "./errors";
import { executeAction } from "./execute";
import { parseAction } from "./validation";
import { z } from "zod";

describe("executeAction", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a success result with the handler's data", async () => {
    const result = await executeAction("noop", async () => ({ id: "abc" }));

    expect(result).toEqual({ success: true, data: { id: "abc" } });
  });

  it("classifies a ValidationError thrown by parseAction, with field errors and no raw Zod shape", async () => {
    const schema = z.object({ name: z.string().min(1) });

    const result = await executeAction("createThing", async () => {
      return parseAction(schema, { name: "" });
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");
    expect(result.error.category).toBe("validation");
    expect(result.error.message).toBe("Some information could not be accepted.");
    expect(result.error.fieldErrors).toEqual({ name: [expect.stringContaining("string")] });
    expect(result.error).not.toHaveProperty("issues");
    expect(result.error.correlationId).toBeTruthy();
  });

  it("classifies an AuthenticationError as authentication, with a generic message", async () => {
    const result = await executeAction("protectedThing", async () => {
      throw new AuthenticationError();
    });

    expect(result).toMatchObject({
      success: false,
      error: { category: "authentication", message: "Sign in required. Please sign in and try again." },
    });
  });

  it("classifies an AuthorizationError raised via assertAuthorized as authorization", async () => {
    const result = await executeAction("restrictedThing", async () => {
      assertAuthorized(false);
      return "unreachable";
    });

    expect(result).toMatchObject({
      success: false,
      error: { category: "authorization", message: "You do not have permission to perform this action." },
    });
  });

  it("classifies NotFoundError and ConflictError as domain failures", async () => {
    const notFound = await executeAction("getThing", async () => {
      throw new NotFoundError("Account abc123 not found for owner xyz789");
    });
    const conflict = await executeAction("deleteThing", async () => {
      throw new ConflictError("Category abc123 still has subcategories");
    });

    expect(notFound).toMatchObject({ success: false, error: { category: "domain" } });
    expect(conflict).toMatchObject({ success: false, error: { category: "domain" } });
    // Internal identifiers in the thrown message must never reach the caller.
    if (!notFound.success) expect(notFound.error.message).not.toContain("abc123");
    if (!conflict.success) expect(conflict.error.message).not.toContain("abc123");
  });

  it("classifies a Drizzle/Postgres-shaped failure as infrastructure without leaking its message", async () => {
    const result = await executeAction("writeThing", async () => {
      const dbError = new Error(
        "duplicate key value violates unique constraint. Key (email)=(user@example.com) already exists.",
      );
      dbError.name = "DrizzleQueryError";
      throw dbError;
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");
    expect(result.error.category).toBe("infrastructure");
    expect(result.error.message).toBe("This action could not be completed right now. Please try again.");
    expect(result.error.message).not.toContain("user@example.com");
  });

  it("classifies an unrecognized error as unexpected without leaking its message", async () => {
    const result = await executeAction("weirdThing", async () => {
      throw new TypeError("Cannot read properties of undefined (reading 'foo')");
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");
    expect(result.error.category).toBe("unexpected");
    expect(result.error.message).toBe("Something went wrong. Please try again.");
    expect(result.error.message).not.toContain("foo");
  });

  it("assigns a distinct correlationId per invocation", async () => {
    const first = await executeAction("thing", async () => {
      throw new TypeError("boom");
    });
    const second = await executeAction("thing", async () => {
      throw new TypeError("boom");
    });

    if (first.success || second.success) throw new Error("expected failures");
    expect(first.error.correlationId).not.toBe(second.error.correlationId);
  });
});
