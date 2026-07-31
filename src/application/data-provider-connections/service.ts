import { z } from "zod";

import type { DataProviderConnectionRepository } from "@/domains/data-provider-connections/repository";
import { DATA_PROVIDER_CONNECTION_STATUSES } from "@/domains/data-provider-connections/types";
import type {
  DataProviderConnection,
  DataProviderConnectionCreateInput,
  DataProviderConnectionUpdateInput,
} from "@/domains/data-provider-connections/types";
import { NotFoundError, ValidationError } from "@/domains/errors";
import type { InstitutionRepository } from "@/domains/institutions/repository";

const createConnectionSchema = z.object({
  ownerId: z.string().uuid(),
  institutionId: z.string().uuid().optional(),
  providerName: z.string().trim().min(1).max(100),
  externalReference: z.string().trim().max(500).optional(),
  status: z.enum(DATA_PROVIDER_CONNECTION_STATUSES).optional(),
  connectedAt: z.date().optional(),
});

const updateConnectionSchema = createConnectionSchema.omit({ ownerId: true }).partial();

export class DataProviderConnectionService {
  constructor(
    private readonly connectionRepository: DataProviderConnectionRepository,
    private readonly institutionRepository: InstitutionRepository,
  ) {}

  async createConnection(input: DataProviderConnectionCreateInput): Promise<DataProviderConnection> {
    const parsed = createConnectionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    if (parsed.data.institutionId) {
      await this.assertInstitutionExists(parsed.data.institutionId);
    }

    return this.connectionRepository.create(parsed.data);
  }

  async listConnections(ownerId: string): Promise<DataProviderConnection[]> {
    return this.connectionRepository.listForOwner(ownerId);
  }

  async getConnection(id: string, ownerId: string): Promise<DataProviderConnection | null> {
    return this.connectionRepository.getByIdForOwner(id, ownerId);
  }

  async updateConnection(
    id: string,
    ownerId: string,
    changes: DataProviderConnectionUpdateInput,
  ): Promise<DataProviderConnection> {
    const parsed = updateConnectionSchema.safeParse(changes);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    if (parsed.data.institutionId) {
      await this.assertInstitutionExists(parsed.data.institutionId);
    }

    return this.connectionRepository.update(id, ownerId, parsed.data);
  }

  async deleteConnection(id: string, ownerId: string): Promise<void> {
    await this.connectionRepository.softDelete(id, ownerId);
  }

  private async assertInstitutionExists(institutionId: string): Promise<void> {
    const institution = await this.institutionRepository.getById(institutionId);
    if (!institution) {
      throw new NotFoundError(`Institution ${institutionId} not found`);
    }
  }
}
