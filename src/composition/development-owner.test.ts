import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveDevelopmentOwnerId } from "./development-owner";

describe("resolveDevelopmentOwnerId", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the configured UUID outside production", () => {
    vi.stubEnv("DEVELOPMENT_OWNER_ID", "00000000-0000-0000-0000-000000000001");

    expect(resolveDevelopmentOwnerId()).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("throws when the environment variable is missing", () => {
    vi.stubEnv("DEVELOPMENT_OWNER_ID", undefined);

    expect(() => resolveDevelopmentOwnerId()).toThrow(/DEVELOPMENT_OWNER_ID is not set/);
  });

  it("throws when the environment variable is not a valid UUID", () => {
    vi.stubEnv("DEVELOPMENT_OWNER_ID", "not-a-uuid");

    expect(() => resolveDevelopmentOwnerId()).toThrow(/must be a valid UUID/);
  });

  it("refuses to run in production even when a valid UUID is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEVELOPMENT_OWNER_ID", "00000000-0000-0000-0000-000000000001");

    expect(() => resolveDevelopmentOwnerId()).toThrow(/development-only scaffolding/);
  });

  it("refuses to run in production even when the environment variable is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEVELOPMENT_OWNER_ID", undefined);

    expect(() => resolveDevelopmentOwnerId()).toThrow(/development-only scaffolding/);
  });
});
