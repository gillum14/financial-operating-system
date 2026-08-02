import { describe, expect, it } from "vitest";

import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";

import { classifyError } from "./classify";
import { AuthenticationError, AuthorizationError } from "./errors";

describe("classifyError", () => {
  it("classifies ValidationError, preserving fieldErrors but not the raw message", () => {
    const error = new ValidationError("internal validation message", { name: ["Required"] });

    const classified = classifyError(error);

    expect(classified.category).toBe("validation");
    expect(classified.message).toBe("Some information could not be accepted.");
    expect(classified.fieldErrors).toEqual({ name: ["Required"] });
  });

  it("classifies AuthenticationError", () => {
    expect(classifyError(new AuthenticationError())).toMatchObject({ category: "authentication" });
  });

  it("classifies AuthorizationError", () => {
    expect(classifyError(new AuthorizationError())).toMatchObject({ category: "authorization" });
  });

  it("classifies NotFoundError and ConflictError as domain, discarding internal-id-bearing messages", () => {
    const notFound = classifyError(new NotFoundError("Account abc-123 not found for owner xyz-789"));
    const conflict = classifyError(new ConflictError("Category abc-123 still has subcategories"));

    expect(notFound).toEqual({ category: "domain", message: "This action could not be completed." });
    expect(conflict).toEqual({ category: "domain", message: "This action could not be completed." });
  });

  it("classifies an error named DrizzleQueryError as infrastructure", () => {
    const error = new Error("some raw SQL failure text");
    error.name = "DrizzleQueryError";

    expect(classifyError(error)).toEqual({
      category: "infrastructure",
      message: "This action could not be completed right now. Please try again.",
    });
  });

  it("classifies an error named PostgresError as infrastructure", () => {
    const error = new Error("relation does not exist");
    error.name = "PostgresError";

    expect(classifyError(error).category).toBe("infrastructure");
  });

  it("classifies an error whose cause carries a SQLSTATE-style code as infrastructure", () => {
    const cause = Object.assign(new Error("duplicate key"), { code: "23505" });
    const error = new Error("query failed", { cause });

    expect(classifyError(error).category).toBe("infrastructure");
  });

  it("classifies a plain Error/TypeError with no recognized shape as unexpected", () => {
    expect(classifyError(new TypeError("boom")).category).toBe("unexpected");
    expect(classifyError(new Error("boom")).category).toBe("unexpected");
  });

  it("classifies a non-Error thrown value as unexpected", () => {
    expect(classifyError("just a string").category).toBe("unexpected");
    expect(classifyError(undefined).category).toBe("unexpected");
  });

  it("never returns fieldErrors for a non-validation category", () => {
    const classified = classifyError(new AuthorizationError());
    expect(classified).not.toHaveProperty("fieldErrors");
  });
});
