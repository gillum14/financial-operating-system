import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { NotFoundError } from "@/domains/errors";
import {
  FakeDataProviderConnectionRepository,
  FakeInstitutionRepository,
} from "@/application/test-support/repository-fakes";

import { DataProviderConnectionService } from "./service";

describe("DataProviderConnectionService", () => {
  let connectionRepository: FakeDataProviderConnectionRepository;
  let institutionRepository: FakeInstitutionRepository;
  let service: DataProviderConnectionService;
  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();

  beforeEach(() => {
    connectionRepository = new FakeDataProviderConnectionRepository();
    institutionRepository = new FakeInstitutionRepository();
    service = new DataProviderConnectionService(connectionRepository, institutionRepository);
  });

  it("creates a manual connection with no institution", async () => {
    const connection = await service.createConnection({ ownerId, providerName: "manual" });

    expect(connection.id).toBeTruthy();
    expect(connection.status).toBe("inactive");
  });

  it("creates a connection with a valid institution", async () => {
    const institution = await institutionRepository.create({ name: "Cascade Community Bank" });

    const connection = await service.createConnection({
      ownerId,
      institutionId: institution.id,
      providerName: "manual",
    });

    expect(connection.institutionId).toBe(institution.id);
  });

  it("rejects a nonexistent institution", async () => {
    await expect(
      service.createConnection({ ownerId, institutionId: randomUUID(), providerName: "manual" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("only lists connections belonging to the given owner", async () => {
    await service.createConnection({ ownerId, providerName: "manual" });
    await service.createConnection({ ownerId: otherOwnerId, providerName: "manual" });

    const connections = await service.listConnections(ownerId);

    expect(connections).toHaveLength(1);
  });

  it("soft-deletes a connection so it no longer resolves", async () => {
    const connection = await service.createConnection({ ownerId, providerName: "manual" });

    await service.deleteConnection(connection.id, ownerId);

    await expect(service.getConnection(connection.id, ownerId)).resolves.toBeNull();
  });
});
