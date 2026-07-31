import { z } from "zod";

import { ConflictError, ValidationError } from "@/domains/errors";
import type { UserRepository } from "@/domains/users/repository";
import type { User, UserCreateInput, UserUpdateInput } from "@/domains/users/types";

const createUserSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().min(1).max(200),
});

const updateUserSchema = createUserSchema.partial();

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
