import { beforeEach, describe, expect, it, vi } from "vitest";

// A distinctive, obviously-sensitive-looking string used as the raw
// Supabase error message in every mocked failure below — every assertion
// that "no raw error is exposed" checks that this exact string never
// appears anywhere in what an action returns.
const RAW_PROVIDER_DETAIL = "pg_hint: connection string contains internal-secret-token-xyz";

function authError(status: number, message = RAW_PROVIDER_DETAIL, code?: string) {
  const error = new Error(message) as Error & { status: number; code?: string };
  error.status = status;
  error.code = code;
  return error;
}

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockResend = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      resend: mockResend,
    },
  }),
}));

// This test only exercises the action's own logic against a mocked
// Supabase client — it doesn't need (and shouldn't require) real Supabase
// Auth credentials, so supabase-env is mocked too rather than depending on
// NEXT_PUBLIC_SUPABASE_ANON_KEY being set in the environment.
vi.mock("@/lib/supabase-env", () => ({
  supabaseEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    SITE_URL: "http://localhost:3000",
  },
}));

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login", () => {
  it("redirects to the safe destination on success", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const { login } = await import("./actions");

    await expect(
      login({}, formData({ email: "a@example.com", password: "correct-password", redirectTo: "/dashboard" })),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("returns the same generic message for wrong password and unknown email alike", async () => {
    const { login } = await import("./actions");

    mockSignInWithPassword.mockResolvedValue({ error: authError(400, RAW_PROVIDER_DETAIL, "invalid_credentials") });
    const wrongPassword = await login({}, formData({ email: "a@example.com", password: "wrong" }));

    mockSignInWithPassword.mockResolvedValue({ error: authError(400, RAW_PROVIDER_DETAIL, "invalid_credentials") });
    const unknownEmail = await login({}, formData({ email: "nobody@example.com", password: "wrong" }));

    mockSignInWithPassword.mockResolvedValue({ error: authError(400, RAW_PROVIDER_DETAIL, "email_not_confirmed") });
    const unconfirmed = await login({}, formData({ email: "a@example.com", password: "wrong" }));

    expect(wrongPassword.error).toBe(unknownEmail.error);
    expect(wrongPassword.error).toBe(unconfirmed.error);
    expect(wrongPassword.error).not.toContain(RAW_PROVIDER_DETAIL);
  });

  it("returns a rate-limit message for a 429", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: authError(429) });
    const { login } = await import("./actions");

    const result = await login({}, formData({ email: "a@example.com", password: "x" }));

    expect(result.error).toMatch(/too many attempts/i);
    expect(result.error).not.toContain(RAW_PROVIDER_DETAIL);
  });

  it("rejects malformed input before ever calling Supabase", async () => {
    const { login } = await import("./actions");

    const result = await login({}, formData({ email: "not-an-email", password: "" }));

    expect(result.error).toBeTruthy();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

describe("signup", () => {
  it("returns the same confirmation message whether Supabase succeeds or reports an existing user", async () => {
    const { signup } = await import("./actions");

    mockSignUp.mockResolvedValue({ error: null });
    const success = await signup({}, formData({ email: "new@example.com", password: "longenough1" }));

    mockSignUp.mockResolvedValue({ error: authError(422, RAW_PROVIDER_DETAIL, "user_already_exists") });
    const alreadyExists = await signup({}, formData({ email: "taken@example.com", password: "longenough1" }));

    expect(success.message).toBe(alreadyExists.message);
    expect(success.message).toMatch(/check your email/i);
    expect(alreadyExists.message).not.toContain(RAW_PROVIDER_DETAIL);
  });

  it("returns a rate-limit message for a 429", async () => {
    mockSignUp.mockResolvedValue({ error: authError(429) });
    const { signup } = await import("./actions");

    const result = await signup({}, formData({ email: "a@example.com", password: "longenough1" }));

    expect(result.error).toMatch(/too many attempts/i);
  });

  it("rejects a short password before calling Supabase", async () => {
    const { signup } = await import("./actions");

    const result = await signup({}, formData({ email: "a@example.com", password: "short" }));

    expect(result.error).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe("requestPasswordReset", () => {
  it("returns the same message regardless of whether the account exists", async () => {
    const { requestPasswordReset } = await import("./actions");

    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const known = await requestPasswordReset({}, formData({ email: "known@example.com" }));

    mockResetPasswordForEmail.mockResolvedValue({ error: authError(400, RAW_PROVIDER_DETAIL, "user_not_found") });
    const unknown = await requestPasswordReset({}, formData({ email: "unknown@example.com" }));

    expect(known.message).toBe(unknown.message);
    expect(unknown.message).not.toContain(RAW_PROVIDER_DETAIL);
  });

  it("returns a rate-limit error for a 429, distinct from the generic message", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: authError(429) });
    const { requestPasswordReset } = await import("./actions");

    const result = await requestPasswordReset({}, formData({ email: "a@example.com" }));

    expect(result.error).toMatch(/too many attempts/i);
  });
});

describe("resetPassword", () => {
  it("redirects to /login on success", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const { resetPassword } = await import("./actions");

    await expect(resetPassword({}, formData({ password: "longenough1" }))).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("returns a generic invalid/expired message without the raw error", async () => {
    mockUpdateUser.mockResolvedValue({ error: authError(403, RAW_PROVIDER_DETAIL, "session_not_found") });
    const { resetPassword } = await import("./actions");

    const result = await resetPassword({}, formData({ password: "longenough1" }));

    expect(result.error).toMatch(/invalid or has expired/i);
    expect(result.error).not.toContain(RAW_PROVIDER_DETAIL);
  });
});

describe("resendConfirmation", () => {
  it("always returns the generic confirmation message, even on failure", async () => {
    mockResend.mockResolvedValue({ error: authError(400, RAW_PROVIDER_DETAIL) });
    const { resendConfirmation } = await import("./actions");

    const result = await resendConfirmation({}, formData({ email: "a@example.com" }));

    expect(result.message).toMatch(/check your email/i);
    expect(result.message).not.toContain(RAW_PROVIDER_DETAIL);
  });

  it("returns a rate-limit error for a 429", async () => {
    mockResend.mockResolvedValue({ error: authError(429) });
    const { resendConfirmation } = await import("./actions");

    const result = await resendConfirmation({}, formData({ email: "a@example.com" }));

    expect(result.error).toMatch(/too many attempts/i);
  });
});
