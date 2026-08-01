import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError, ValidationError } from "@/domains/errors";
import { FakeUserRepository } from "@/application/test-support/repository-fakes";

import { UserService } from "./service";

describe("UserService", () => {
  let repository: FakeUserRepository;
  let service: UserService;

  beforeEach(() => {
    repository = new FakeUserRepository();
    service = new UserService(repository);
  });

  it("creates a user with valid input", async () => {
    const id = randomUUID();
    const user = await service.createUser({ id, email: "dev@example.com", displayName: "Dev User" });

    expect(user.id).toBe(id);
    expect(user.email).toBe("dev@example.com");
    expect(user.displayName).toBe("Dev User");
  });

  it("normalizes email to lowercase and trimmed", async () => {
    const user = await service.createUser({
      id: randomUUID(),
      email: "  Dev@Example.COM  ",
      displayName: "Dev User",
    });

    expect(user.email).toBe("dev@example.com");
  });

  it("rejects an invalid email", async () => {
    await expect(
      service.createUser({ id: randomUUID(), email: "not-an-email", displayName: "Dev User" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an invalid id", async () => {
    await expect(
      service.createUser({ id: "not-a-uuid", email: "dev@example.com", displayName: "Dev User" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a duplicate email", async () => {
    await service.createUser({ id: randomUUID(), email: "dev@example.com", displayName: "First" });

    await expect(
      service.createUser({ id: randomUUID(), email: "dev@example.com", displayName: "Second" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("returns null for a nonexistent user", async () => {
    await expect(service.getUser("00000000-0000-0000-0000-000000000999")).resolves.toBeNull();
  });

  it("updates a user", async () => {
    const user = await service.createUser({ id: randomUUID(), email: "dev@example.com", displayName: "Dev User" });

    const updated = await service.updateUser(user.id, { displayName: "Updated Name" });

    expect(updated.displayName).toBe("Updated Name");
  });

  it("soft-deletes a user so it no longer resolves", async () => {
    const user = await service.createUser({ id: randomUUID(), email: "dev@example.com", displayName: "Dev User" });

    await service.deleteUser(user.id);

    await expect(service.getUser(user.id)).resolves.toBeNull();
  });
});
