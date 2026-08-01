import { beforeEach, describe, expect, it, vi } from "vitest";

// getAuthenticatedUser is wrapped in React's cache(), which memoizes across
// calls within a module instance — vi.resetModules() + a fresh dynamic
// import per test avoids one test's cached result leaking into the next,
// mirroring this project's existing pattern for module-level state
// (see src/infrastructure/db/*.test.ts's deferred @/db/client import).
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}));

describe("getAuthenticatedUser / requireAuthenticatedUser", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetUser.mockReset();
  });

  it("returns the verified identity when Supabase confirms a user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "person@example.com", email_confirmed_at: "2026-01-01T00:00:00Z" } },
      error: null,
    });

    const { getAuthenticatedUser } = await import("./authenticated-user");
    const user = await getAuthenticatedUser();

    expect(user).toEqual({ id: "user-1", email: "person@example.com", emailConfirmedAt: "2026-01-01T00:00:00Z" });
  });

  it("returns null when Supabase returns no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { getAuthenticatedUser } = await import("./authenticated-user");

    await expect(getAuthenticatedUser()).resolves.toBeNull();
  });

  it("returns null when getUser() itself errors, never trusting an unverified session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("network unreachable") });

    const { getAuthenticatedUser } = await import("./authenticated-user");

    await expect(getAuthenticatedUser()).resolves.toBeNull();
  });

  it("requireAuthenticatedUser redirects (never returns) when no verified user exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { requireAuthenticatedUser } = await import("./authenticated-user");

    // next/navigation's redirect() throws a special NEXT_REDIRECT signal
    // rather than returning — this proves the function never falls through
    // to return a value when unauthenticated.
    await expect(requireAuthenticatedUser()).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("requireAuthenticatedUser returns the identity when one exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-2", email: "verified@example.com", email_confirmed_at: null } },
      error: null,
    });

    const { requireAuthenticatedUser } = await import("./authenticated-user");
    const user = await requireAuthenticatedUser();

    expect(user).toEqual({ id: "user-2", email: "verified@example.com", emailConfirmedAt: null });
  });

  it("never derives an identity from anything other than the verified Supabase response", async () => {
    // A user object missing email (Supabase allows phone-only accounts,
    // not supported by this slice's email/password-only flows) must not
    // produce a usable identity from partial/malformed data.
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-3", email: null } },
      error: null,
    });

    const { getAuthenticatedUser } = await import("./authenticated-user");

    await expect(getAuthenticatedUser()).resolves.toBeNull();
  });
});
