import type { ActionErrorCategory } from "./types";

// Logs only what's safe to log, never the action's raw input. For
// validation/authentication/authorization/domain errors the message is
// text this codebase itself authored (see src/domains/errors.ts and
// ./errors.ts), so it's safe to record. For infrastructure/unexpected
// errors the message is NOT trusted — Postgres constraint-violation
// messages, for example, can embed the actual offending value (e.g. "Key
// (email)=(user@example.com) already exists") — so only the error's name
// and, if present, its stable SQLSTATE-style `code` are recorded.
export function logActionError(name: string, category: ActionErrorCategory, error: unknown, correlationId: string): void {
  console.error(`[action:${name}] [${category}] [${correlationId}]`, describeSafely(category, error));
}

function describeSafely(category: ActionErrorCategory, error: unknown): string {
  if (!(error instanceof Error)) {
    return "non-error value thrown";
  }
  if (category !== "infrastructure" && category !== "unexpected") {
    return `${error.name}: ${error.message}`;
  }
  const cause = "cause" in error ? (error as { cause?: unknown }).cause : undefined;
  const code = cause && typeof cause === "object" && "code" in cause ? (cause as { code?: unknown }).code : undefined;
  return typeof code === "string" ? `${error.name} (code=${code})` : error.name;
}
