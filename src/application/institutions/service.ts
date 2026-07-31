import { z } from "zod";

import { ValidationError } from "@/domains/errors";
import type { InstitutionRepository } from "@/domains/institutions/repository";
import type { Institution, InstitutionCreateInput, InstitutionUpdateInput } from "@/domains/institutions/types";

const createInstitutionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  providerName: z.string().trim().min(1).max(100).optional(),
  logoUrl: z.string().trim().url().optional(),
});

const updateInstitutionSchema = createInstitutionSchema.partial();

export class InstitutionService {
  constructor(private readonly institutionRepository: InstitutionRepository) {}

  async createInstitution(input: InstitutionCreateInput): Promise<Institution> {
    const parsed = createInstitutionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    return this.institutionRepository.create(parsed.data);
  }

  async listInstitutions(): Promise<Institution[]> {
    return this.institutionRepository.list();
  }

  async getInstitution(id: string): Promise<Institution | null> {
    return this.institutionRepository.getById(id);
  }

  async updateInstitution(id: string, changes: InstitutionUpdateInput): Promise<Institution> {
    const parsed = updateInstitutionSchema.safeParse(changes);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    return this.institutionRepository.update(id, parsed.data);
  }

  async deleteInstitution(id: string): Promise<void> {
    await this.institutionRepository.softDelete(id);
  }
}
