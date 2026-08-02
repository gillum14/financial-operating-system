// Shared result contract for every Server Action. Safe to import from
// Client Components (e.g. to type useActionState) — contains no server-only
// code, just types.

export type ActionErrorCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "domain"
  | "infrastructure"
  | "unexpected";

export type ActionError = {
  category: ActionErrorCategory;
  // Always safe to render: generic for infrastructure/unexpected, specific
  // but internals-free for validation/authentication/authorization/domain.
  message: string;
  // Present only for validation failures with per-field detail.
  fieldErrors?: Record<string, string[]>;
  // Opaque per-invocation id, safe to display for support reference.
  correlationId: string;
};

export type ActionResult<T> = { success: true; data: T } | { success: false; error: ActionError };
