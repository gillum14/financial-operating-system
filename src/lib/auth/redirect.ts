// Prevents open redirects: a `redirectTo` value must be an internal path
// under an explicitly allowed prefix, never an absolute or protocol-relative
// URL. Grows as more authenticated routes are added.
const ALLOWED_REDIRECT_PREFIXES = ["/dashboard", "/reset-password"];
const DEFAULT_REDIRECT = "/dashboard";

export function resolveSafeRedirect(candidate: string | null | undefined): string {
  if (!candidate) return DEFAULT_REDIRECT;
  // Reject absolute URLs ("https://evil.com") and protocol-relative ones
  // ("//evil.com", which browsers treat as absolute too).
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return DEFAULT_REDIRECT;

  // A prefix matches exactly, or is followed by "/", "?", or "#" — so
  // "/dashboard?tab=x" and "/dashboard/foo" are both allowed, but
  // "/dashboardish" (which merely starts with the same characters) is not.
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some((prefix) => {
    if (candidate === prefix) return true;
    if (!candidate.startsWith(prefix)) return false;
    const nextChar = candidate.charAt(prefix.length);
    return nextChar === "/" || nextChar === "?" || nextChar === "#";
  });
  return isAllowed ? candidate : DEFAULT_REDIRECT;
}
