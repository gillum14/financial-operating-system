// Interface-layer error types. These represent failures that belong to the
// Server Action boundary itself (no verified session, operation not
// permitted) rather than to domain logic — src/domains/errors.ts covers
// domain rule violations (NotFoundError, ValidationError, ConflictError).

export class AuthenticationError extends Error {
  constructor(message = "Sign in required. Please sign in and try again.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}
