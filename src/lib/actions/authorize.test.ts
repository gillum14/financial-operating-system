import { describe, expect, it } from "vitest";

import { assertAuthorized } from "./authorize";
import { AuthorizationError } from "./errors";

describe("assertAuthorized", () => {
  it("does not throw when the condition is truthy", () => {
    expect(() => assertAuthorized(true)).not.toThrow();
    expect(() => assertAuthorized("non-empty")).not.toThrow();
  });

  it("throws AuthorizationError with the default message when the condition is falsy", () => {
    try {
      assertAuthorized(false);
      throw new Error("expected assertAuthorized to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorizationError);
      expect((error as AuthorizationError).message).toBe("You do not have permission to perform this action.");
    }
  });

  it("throws AuthorizationError with a custom message when provided", () => {
    try {
      assertAuthorized(null, "You do not own this account.");
      throw new Error("expected assertAuthorized to throw");
    } catch (error) {
      expect((error as AuthorizationError).message).toBe("You do not own this account.");
    }
  });

  it("narrows the condition's type for callers (compile-time only, exercised at runtime here)", () => {
    const maybe: string | null = "value";
    assertAuthorized(maybe);
    expect(maybe.length).toBeGreaterThan(0);
  });
});
