import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { NotFoundError, ValidationError } from "@/domains/errors";
import {
  FakeAccountRepository,
  FakeInstitutionRepository,
} from "@/application/test-support/repository-fakes";

import { AccountService } from "./service";

describe("AccountService", () => {
  let accountRepository: FakeAccountRepository;
  let institutionRepository: FakeInstitutionRepository;
  let service: AccountService;
  const ownerId = randomUUID();

  beforeEach(() => {
    accountRepository = new FakeAccountRepository();
    institutionRepository = new FakeInstitutionRepository();
    service = new AccountService(accountRepository, institutionRepository);
  });

  it("creates an account with no institution", async () => {
    const account = await service.createAccount({
      ownerId,
      name: "Everyday Checking",
      accountType: "checking",
    });

    expect(account.id).toBeTruthy();
    expect(account.status).toBe("active");
    expect(account.currency).toBe("USD");
  });

  it("creates an account with a valid institution", async () => {
    const institution = await institutionRepository.create({ name: "Cascade Community Bank" });

    const account = await service.createAccount({
      ownerId,
      institutionId: institution.id,
      name: "Everyday Checking",
      accountType: "checking",
    });

    expect(account.institutionId).toBe(institution.id);
  });

  it("rejects a nonexistent institution", async () => {
    await expect(
      service.createAccount({
        ownerId,
        institutionId: randomUUID(),
        name: "Everyday Checking",
        accountType: "checking",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects an invalid account type", async () => {
    await expect(
      service.createAccount({
        ownerId,
        name: "Everyday Checking",
        // @ts-expect-error intentionally invalid for the test
        accountType: "not-a-real-type",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("only lists accounts belonging to the given owner", async () => {
    await service.createAccount({ ownerId, name: "Mine", accountType: "checking" });
    await service.createAccount({ ownerId: randomUUID(), name: "Someone else's", accountType: "checking" });

    const accounts = await service.listAccounts(ownerId);

    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe("Mine");
  });

  it("archives an account without deleting it", async () => {
    const account = await service.createAccount({ ownerId, name: "Old Card", accountType: "credit-card" });

    const archived = await service.archiveAccount(account.id, ownerId);

    expect(archived.status).toBe("archived");
    await expect(service.getAccount(account.id, ownerId)).resolves.not.toBeNull();
  });

  it("soft-deletes an account so it no longer resolves", async () => {
    const account = await service.createAccount({ ownerId, name: "Old Card", accountType: "credit-card" });

    await service.deleteAccount(account.id, ownerId);

    await expect(service.getAccount(account.id, ownerId)).resolves.toBeNull();
  });
});
