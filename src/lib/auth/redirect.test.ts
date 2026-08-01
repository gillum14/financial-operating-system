import { describe, expect, it } from "vitest";

import { resolveSafeRedirect } from "./redirect";

describe("resolveSafeRedirect", () => {
  it("passes through an allowed internal path", () => {
    expect(resolveSafeRedirect("/dashboard")).toBe("/dashboard");
    expect(resolveSafeRedirect("/dashboard?tab=activity")).toBe("/dashboard?tab=activity");
    expect(resolveSafeRedirect("/reset-password")).toBe("/reset-password");
  });

  it("falls back to the default for a missing value", () => {
    expect(resolveSafeRedirect(null)).toBe("/dashboard");
    expect(resolveSafeRedirect(undefined)).toBe("/dashboard");
    expect(resolveSafeRedirect("")).toBe("/dashboard");
  });

  it("rejects an absolute external URL", () => {
    expect(resolveSafeRedirect("https://evil.example.com")).toBe("/dashboard");
    expect(resolveSafeRedirect("http://evil.example.com/dashboard")).toBe("/dashboard");
  });

  it("rejects a protocol-relative URL", () => {
    expect(resolveSafeRedirect("//evil.example.com")).toBe("/dashboard");
  });

  it("rejects an internal path not on the allowlist", () => {
    expect(resolveSafeRedirect("/some/unlisted/route")).toBe("/dashboard");
  });

  it("rejects a path that merely starts with an allowed prefix as a substring", () => {
    // "/dashboardish" is not "/dashboard" or "/dashboard/..." — must not pass.
    expect(resolveSafeRedirect("/dashboardish")).toBe("/dashboard");
  });
});
