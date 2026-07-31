import { beforeEach, describe, expect, it } from "vitest";

import { ValidationError } from "@/domains/errors";
import { FakeInstitutionRepository } from "@/application/test-support/repository-fakes";

import { InstitutionService } from "./service";

describe("InstitutionService", () => {
  let repository: FakeInstitutionRepository;
  let service: InstitutionService;

  beforeEach(() => {
    repository = new FakeInstitutionRepository();
    service = new InstitutionService(repository);
  });

  it("creates an institution with valid input", async () => {
    const institution = await service.createInstitution({ name: "Cascade Community Bank" });

    expect(institution.id).toBeTruthy();
    expect(institution.name).toBe("Cascade Community Bank");
  });

  it("rejects an empty name", async () => {
    await expect(service.createInstitution({ name: "" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("lists created institutions", async () => {
    await service.createInstitution({ name: "Cascade Community Bank" });
    await service.createInstitution({ name: "Harbor Trust Credit Union" });

    const institutions = await service.listInstitutions();

    expect(institutions).toHaveLength(2);
  });

  it("soft-deletes an institution so it no longer resolves", async () => {
    const institution = await service.createInstitution({ name: "Cascade Community Bank" });

    await service.deleteInstitution(institution.id);

    await expect(service.getInstitution(institution.id)).resolves.toBeNull();
  });
});
