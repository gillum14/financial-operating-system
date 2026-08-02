import type { ActionError, ActionErrorCategory, ActionResult } from "./types";

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(
  category: ActionErrorCategory,
  message: string,
  fieldErrors: Record<string, string[]> | undefined,
  correlationId: string,
): ActionResult<never> {
  const error: ActionError = { category, message, correlationId };
  if (fieldErrors) {
    error.fieldErrors = fieldErrors;
  }
  return { success: false, error };
}
