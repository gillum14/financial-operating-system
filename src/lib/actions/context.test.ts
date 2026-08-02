import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthenticatedUser = vi.fn();

vi.mock("@/lib/auth/authenticated-user", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

describe("requireActionUser", () => {
  beforeEach(() => {
    mockGetAuthenticatedUser.mockReset();
  });

  it("returns the authenticated user when a session exists", async () => {
    const user = { id: "user-1", email: "person@example.com", emailConfirmedAt: null };
    mockGetAuthenticatedUser.mockResolvedValue(user);

    const { requireActionUser } = await import("./context");

    await expect(requireActionUser()).resolves.toEqual(user);
  });

  it("throws AuthenticationError instead of redirecting when no session exists", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const { requireActionUser } = await import("./context");
    const { AuthenticationError } = await import("./errors");

    await expect(requireActionUser()).rejects.toBeInstanceOf(AuthenticationError);
  });
});
