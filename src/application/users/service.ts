import { z } from "zod";

import { ConflictError, ValidationError } from "@/domains/errors";
import type { UserRepository } from "@/domains/users/repository";
import type { User, UserCreateInput, UserUpdateInput } from "@/domains/users/types";

// Email is normalized (trimmed, lowercased) consistently everywhere a user
// row can be written — this schema and the handle_new_user DB trigger
// (src/db/migrations/0002_handle_new_user_trigger.sql) — so the active-user
// uniqueness index and any future lookup-by-email both operate on one
// canonical form. No authorization logic may use email; this is a display/
// contact field only, cached from the authoritative auth.users row.
const createUserSchema = z.object({
  id: z.string().uuid(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email(),
  displayName: z.string().trim().min(1).max(200),
});

const updateUserSchema = createUserSchema.partial().omit({ id: true });

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(input: UserCreateInput): Promise<User> {
    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const existing = await this.userRepository.getByEmail(parsed.data.email);
    if (existing) {
      throw new ConflictError(`A user with email ${parsed.data.email} already exists`);
    }

    return this.userRepository.create(parsed.data);
  }

  async getUser(id: string): Promise<User | null> {
    return this.userRepository.getById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.getByEmail(email);
  }

  async updateUser(id: string, changes: UserUpdateInput): Promise<User> {
    const parsed = updateUserSchema.safeParse(changes);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    return this.userRepository.update(id, parsed.data);
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepository.softDelete(id);
  }
}
