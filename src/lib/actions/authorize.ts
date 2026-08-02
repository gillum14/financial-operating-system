import { AuthorizationError } from "./errors";

// Generic authorization gate for Server Actions. Deliberately has no
// business rules baked in — callers supply the condition (e.g. an ownership
// check, a plan-tier check); this just standardizes how a failed check
// becomes a typed, classified error instead of an ad hoc thrown Error.
export function assertAuthorized(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new AuthorizationError(message);
  }
}
