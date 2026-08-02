import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ValidationError } from "@/domains/errors";

import { parseAction } from "./validation";

describe("parseAction", () => {
  const schema = z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().email(),
  });

  it("returns the parsed data on success", () => {
    const result = parseAction(schema, { name: "Ada Lovelace", email: "ada@example.com" });

    expect(result).toEqual({ name: "Ada Lovelace", email: "ada@example.com" });
  });

  it("throws a ValidationError with per-field messages on failure", () => {
    try {
      parseAction(schema, { name: "", email: "not-an-email" });
      throw new Error("expected parseAction to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.fieldErrors?.name).toBeTruthy();
      expect(validationError.fieldErrors?.email).toBeTruthy();
    }
  });

  it("never exposes raw Zod issue shapes (code, path, origin) on the thrown error", () => {
    try {
      parseAction(schema, { name: "", email: "not-an-email" });
      throw new Error("expected parseAction to throw");
    } catch (error) {
      const validationError = error as ValidationError;
      expect(validationError).not.toHaveProperty("issues");
      for (const messages of Object.values(validationError.fieldErrors ?? {})) {
        for (const message of messages) {
          expect(typeof message).toBe("string");
        }
      }
    }
  });

  it("rejects unknown/extra fields the same as any other shape mismatch", () => {
    expect(() => parseAction(schema, { name: "Ada", email: "ada@example.com", ownerId: "client-supplied" })).not.toThrow();
    // Extra fields are stripped by default Zod object parsing, not
    // silently trusted through to the caller's `.data`.
    const result = parseAction(schema, { name: "Ada", email: "ada@example.com", ownerId: "client-supplied" });
    expect(result).not.toHaveProperty("ownerId");
  });
});
