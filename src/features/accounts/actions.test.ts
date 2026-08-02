import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountService } from "@/application/accounts/service";
import { FakeAccountRepository, FakeInstitutionRepository } from "@/application/test-support/repository-fakes";

import {
  archiveAccount,
  createAccount,
  getAccount,
  listActiveAccounts,
  listArchivedAccounts,
  restoreAccount,
  updateAccount,
} from "./actions";

// vi.mock factories are hoisted above every other top-level statement, so
// anything they reference must come from vi.hoisted() rather than a plain
// const/let — otherwise it's a TDZ error at module-evaluation time.
const mockGetAuthenticatedUser = vi.hoisted(() => vi.fn());
const repos = vi.hoisted(() => ({
  accountRepository: undefined as unknown as FakeAccountRepository,
  institutionRepository: undefined as unknown as FakeInstitutionRepository,
}));

vi.mock("@/lib/auth/authenticated-user", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

// A real AccountService over the in-memory fakes, constructed lazily so
// each test's beforeEach-created repository instances are the ones used —
// exercises real service business rules (validation, NotFoundError) with
// no database. This mock doesn't involve React's cache(), so — unlike
// src/lib/auth/authenticated-user.test.ts — there's no need for
// vi.resetModules()/per-test dynamic import: a single static import of the
// action functions below is safe and keeps `instanceof` checks (e.g.
// NotFoundError, checked by src/lib/actions/classify.ts) consistent across
// the whole test run.
vi.mock("@/composition/accounts-composition", () => ({
  getAccountService: () => new AccountService(repos.accountRepository, repos.institutionRepository),
}));

function signInAs(userId: string) {
  mockGetAuthenticatedUser.mockResolvedValue({ id: userId, email: "person@example.com", emailConfirmedAt: null });
}

describe("Accounts Server Actions", () => {
  const ownerId = randomUUID();

  beforeEach(() => {
    mockGetAuthenticatedUser.mockReset();
    repos.accountRepository = new FakeAccountRepository();
    repos.institutionRepository = new FakeInstitutionRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authentication", () => {
    it("createAccount fails with authentication category when unauthenticated", async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const result = await createAccount({ name: "Checking", accountType: "checking" });

      expect(result).toMatchObject({ success: false, error: { category: "authentication" } });
    });

    it("listActiveAccounts fails with authentication category when unauthenticated", async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const result = await listActiveAccounts();

      expect(result).toMatchObject({ success: false, error: { category: "authentication" } });
    });

    it("archiveAccount and restoreAccount fail with authentication category when unauthenticated", async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      await expect(archiveAccount({ accountId: randomUUID() })).resolves.toMatchObject({
        success: false,
        error: { category: "authentication" },
      });
      await expect(restoreAccount({ accountId: randomUUID() })).resolves.toMatchObject({
        success: false,
        error: { category: "authentication" },
      });
    });
  });

  describe("validation", () => {
    it("createAccount fails with validation category and field errors on a missing name", async () => {
      signInAs(ownerId);

      const result = await createAccount({ accountType: "checking" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("expected failure");
      expect(result.error.category).toBe("validation");
      expect(result.error.fieldErrors?.name).toBeTruthy();
    });

    it("createAccount fails with validation category on an invalid accountType", async () => {
      signInAs(ownerId);

      const result = await createAccount({ name: "Checking", accountType: "not-a-real-type" });

      expect(result).toMatchObject({ success: false, error: { category: "validation" } });
    });

    it("getAccount fails with validation category on a malformed accountId", async () => {
      signInAs(ownerId);

      const result = await getAccount({ accountId: "not-a-uuid" });

      expect(result).toMatchObject({ success: false, error: { category: "validation" } });
    });

    it("updateAccount fails with validation category on an invalid currentBalance", async () => {
      signInAs(ownerId);
      const created = await createAccount({ name: "Checking", accountType: "checking" });
      if (!created.success) throw new Error("setup failed");

      const result = await updateAccount({ accountId: created.data.id, currentBalance: "not-a-decimal" });

      expect(result).toMatchObject({ success: false, error: { category: "validation" } });
    });
  });

  describe("successful execution", () => {
    it("creates an account, deriving ownerId from the session and ignoring any client-supplied ownerId", async () => {
      signInAs(ownerId);

      const result = await createAccount({
        name: "Everyday Checking",
        accountType: "checking",
        ownerId: "attacker-controlled-id",
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("expected success");
      expect(result.data.ownerId).toBe(ownerId);
      expect(result.data.ownerId).not.toBe("attacker-controlled-id");
      expect(result.data.status).toBe("active");
    });

    it("updates mutable fields on an owned account", async () => {
      signInAs(ownerId);
      const created = await createAccount({ name: "Checking", accountType: "checking" });
      if (!created.success) throw new Error("setup failed");

      const result = await updateAccount({ accountId: created.data.id, name: "Renamed Checking" });

      expect(result).toMatchObject({ success: true, data: { name: "Renamed Checking", ownerId } });
    });

    it("archives an owned account", async () => {
      signInAs(ownerId);
      const created = await createAccount({ name: "Old Card", accountType: "credit-card" });
      if (!created.success) throw new Error("setup failed");

      const result = await archiveAccount({ accountId: created.data.id });

      expect(result).toMatchObject({ success: true, data: { status: "archived" } });
    });

    it("restores an archived account back to active", async () => {
      signInAs(ownerId);
      const created = await createAccount({ name: "Old Card", accountType: "credit-card" });
      if (!created.success) throw new Error("setup failed");
      await archiveAccount({ accountId: created.data.id });

      const result = await restoreAccount({ accountId: created.data.id });

      expect(result).toMatchObject({ success: true, data: { status: "active" } });
      await expect(listActiveAccounts()).resolves.toMatchObject({ success: true, data: [{ id: created.data.id }] });
      await expect(listArchivedAccounts()).resolves.toMatchObject({ success: true, data: [] });
    });

    it("getAccount returns an owned account", async () => {
      signInAs(ownerId);
      const created = await createAccount({ name: "Checking", accountType: "checking" });
      if (!created.success) throw new Error("setup failed");

      const result = await getAccount({ accountId: created.data.id });

      expect(result).toMatchObject({ success: true, data: { id: created.data.id } });
    });
  });

  // Cross-owner access is denied the same way an absent resource would be —
  // NotFoundError, classified as "domain" — rather than a distinct
  // "authorization" category, matching this codebase's established
  // convention (see docs/architecture/security-architecture.md /
  // api-architecture.md "Cross-Owner Response Behavior") of never
  // confirming another owner's resource exists.
  describe("authorization (cross-owner access)", () => {
    it("getAccount denies access to another owner's account without confirming it exists", async () => {
      signInAs(ownerId);
      const created = await createAccount({ name: "Checking", accountType: "checking" });
      if (!created.success) throw new Error("setup failed");

      signInAs(randomUUID());
      const result = await getAccount({ accountId: created.data.id });

      expect(result).toMatchObject({ success: false, error: { category: "domain" } });
    });

    it("updateAccount denies mutating another owner's account", async () => {
      signInAs(ownerId);
      const created = await createAccount({ name: "Checking", accountType: "checking" });
      if (!created.success) throw new Error("setup failed");

      signInAs(randomUUID());
      const result = await updateAccount({ accountId: created.data.id, name: "Hijacked" });

      expect(result).toMatchObject({ success: false, error: { category: "domain" } });
    });

    it("archiveAccount and restoreAccount deny access to another owner's account", async () => {
      signInAs(ownerId);
      const created = await createAccount({ name: "Checking", accountType: "checking" });
      if (!created.success) throw new Error("setup failed");

      signInAs(randomUUID());

      await expect(archiveAccount({ accountId: created.data.id })).resolves.toMatchObject({
        success: false,
        error: { category: "domain" },
      });
      await expect(restoreAccount({ accountId: created.data.id })).resolves.toMatchObject({
        success: false,
        error: { category: "domain" },
      });
    });
  });

  describe("generic error responses", () => {
    it("never leaks a raw infrastructure error from a failed create", async () => {
      signInAs(ownerId);
      const dbError = new Error("duplicate key value violates unique constraint (owner_id)=(secret) already exists");
      dbError.name = "DrizzleQueryError";
      vi.spyOn(repos.accountRepository, "create").mockRejectedValueOnce(dbError);

      const result = await createAccount({ name: "Checking", accountType: "checking" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("expected failure");
      expect(result.error.category).toBe("infrastructure");
      expect(result.error.message).toBe("This action could not be completed right now. Please try again.");
      expect(JSON.stringify(result.error)).not.toContain("secret");
    });

    it("never leaks a raw unexpected error from a failed list", async () => {
      signInAs(ownerId);
      vi.spyOn(repos.accountRepository, "listForOwner").mockRejectedValueOnce(
        new TypeError("Cannot read properties of undefined (reading 'rows')"),
      );

      const result = await listActiveAccounts();

      expect(result).toMatchObject({
        success: false,
        error: { category: "unexpected", message: "Something went wrong. Please try again." },
      });
    });
  });
});
