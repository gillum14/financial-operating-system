import type { User, UserCreateInput, UserUpdateInput } from "./types";

export interface UserRepository {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  create(input: UserCreateInput): Promise<User>;
  update(id: string, changes: UserUpdateInput): Promise<User>;
  softDelete(id: string): Promise<void>;
}
