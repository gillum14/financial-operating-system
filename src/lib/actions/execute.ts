import { randomUUID } from "node:crypto";

import { classifyError } from "./classify";
import { logActionError } from "./logging";
import { fail, ok } from "./result";
import type { ActionResult } from "./types";

// The one required entry/exit point for every Server Action's body. Wrap
// the action's work in `run`; whatever it throws — ValidationError (from
// parseAction), AuthenticationError (from requireActionUser),
// AuthorizationError (from assertAuthorized), a domain error, or anything
// unrecognized — is classified, logged safely, and turned into a typed
// ActionResult failure. Nothing thrown inside `run` should ever reach the
// caller as a raw exception.
//
// `name` identifies the action in logs only (e.g. "createAccount") — it is
// never shown to the user and carries no sensitive data.
export async function executeAction<T>(name: string, run: () => Promise<T>): Promise<ActionResult<T>> {
  const correlationId = randomUUID();
  try {
    return ok(await run());
  } catch (error) {
    const classified = classifyError(error);
    logActionError(name, classified.category, error, correlationId);
    return fail(classified.category, classified.message, classified.fieldErrors, correlationId);
  }
}
