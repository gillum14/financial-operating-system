import type {
  DataProviderConnection,
  DataProviderConnectionCreateInput,
  DataProviderConnectionUpdateInput,
} from "./types";

export interface DataProviderConnectionRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<DataProviderConnection | null>;
  listForOwner(ownerId: string): Promise<DataProviderConnection[]>;
  create(input: DataProviderConnectionCreateInput): Promise<DataProviderConnection>;
  update(
    id: string,
    ownerId: string,
    changes: DataProviderConnectionUpdateInput,
  ): Promise<DataProviderConnection>;
  softDelete(id: string, ownerId: string): Promise<void>;
}
