import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";

import { AuthenticationError, AuthorizationError } from "./errors";
import type { ActionError, ActionErrorCategory } from "./types";

const GENERIC_MESSAGE: Record<ActionErrorCategory, string> = {
  validation: "Some information could not be accepted.",
  authentication: "Sign in required. Please sign in and try again.",
  authorization: "You do not have permission to perform this action.",
  domain: "This action could not be completed.",
  infrastructure: "This action could not be completed right now. Please try again.",
  unexpected: "Something went wrong. Please try again.",
};

// Duck-types a repository/infrastructure failure without importing
// drizzle-orm or postgres here (this module has no business being coupled
// to a specific driver). Both drizzle-orm's DrizzleQueryError and
// postgres.js's PostgresError expose a stable SQLSTATE-style `code`,
// either directly or via `.cause` (Drizzle wraps the driver error in
// `.cause`) — that shape is what we key off of, not the message text.
function isInfrastructureError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "DrizzleQueryError" || error.name === "PostgresError") return true;
  const cause = "cause" in error ? (error as { cause?: unknown }).cause : undefined;
  return Boolean(
    cause && typeof cause === "object" && "code" in cause && typeof (cause as { code?: unknown }).code === "string",
  );
}

// Converts any thrown value into a safe, categorized ActionError. This is
// the single point where an exception's raw message is judged trustworthy
// (our own typed errors) or not (everything else) — see also
// logActionError, which applies the same distinction to what gets logged.
export function classifyError(error: unknown): Omit<ActionError, "correlationId"> {
  if (error instanceof ValidationError) {
    return { category: "validation", message: GENERIC_MESSAGE.validation, fieldErrors: error.fieldErrors };
  }
  if (error instanceof AuthenticationError) {
    return { category: "authentication", message: GENERIC_MESSAGE.authentication };
  }
  if (error instanceof AuthorizationError) {
    return { category: "authorization", message: GENERIC_MESSAGE.authorization };
  }
  if (error instanceof NotFoundError || error instanceof ConflictError) {
    return { category: "domain", message: GENERIC_MESSAGE.domain };
  }
  if (isInfrastructureError(error)) {
    return { category: "infrastructure", message: GENERIC_MESSAGE.infrastructure };
  }
  return { category: "unexpected", message: GENERIC_MESSAGE.unexpected };
}
