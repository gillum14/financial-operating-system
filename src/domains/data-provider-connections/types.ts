import {
  DATA_PROVIDER_CONNECTION_STATUSES,
  type DataProviderConnection,
  type DataProviderConnectionStatus,
  type NewDataProviderConnection,
} from "@/db/schema/data-provider-connections";

export { DATA_PROVIDER_CONNECTION_STATUSES };
export type { DataProviderConnection, DataProviderConnectionStatus };

export type DataProviderConnectionCreateInput = Omit<
  NewDataProviderConnection,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

export type DataProviderConnectionUpdateInput = Partial<
  Omit<NewDataProviderConnection, "id" | "ownerId" | "createdAt" | "updatedAt" | "deletedAt">
>;
