import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { NotFoundError } from "@/domains/errors";

const mockGetAuthenticatedUser = vi.fn();

vi.mock("@/lib/auth/authenticated-user", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

// Exercises the full stack a real Server Action is expected to assemble —
// requireActionUser + parseAction + assertAuthorized, all wrapped by
// executeAction — the way "Server Action conventions" documents it should
// be composed. No product feature lives here; this is the framework
// proving itself end to end.
describe("Server Action framework composition", () => {
  beforeEach(() => {
    mockGetAuthenticatedUser.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const inputSchema = z.object({ name: z.string().trim().min(1).max(200) });

  type Widget = { id: string; ownerId: string; name: string };

  async function createWidgetAction(
    rawInput: unknown,
    deps: { store: Map<string, Widget> },
  ) {
    const { executeAction } = await import("./execute");
    const { requireActionUser } = await import("./context");
    const { parseAction } = await import("./validation");

    return executeAction("createWidget", async () => {
      const user = await requireActionUser();
      const input = parseAction(inputSchema, rawInput);

      // The only owner id a Server Action should ever persist is the one
      // derived from the verified session — never anything read out of
      // `rawInput`, even if the caller smuggled one in.
      const widget: Widget = { id: randomUUID(), ownerId: user.id, name: input.name };
      deps.store.set(widget.id, widget);
      return widget;
    });
  }

  it("derives ownerId from the session, ignoring a client-supplied ownerId in the input", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "real-user-1", email: "a@example.com", emailConfirmedAt: null });
    const store = new Map<string, Widget>();

    const result = await createWidgetAction({ name: "Mine", ownerId: "attacker-controlled-id" }, { store });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.ownerId).toBe("real-user-1");
    expect(result.data.ownerId).not.toBe("attacker-controlled-id");
  });

  it("fails with authentication category, never running the handler, when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const store = new Map<string, Widget>();

    const result = await createWidgetAction({ name: "Mine" }, { store });

    expect(result).toMatchObject({ success: false, error: { category: "authentication" } });
    expect(store.size).toBe(0);
  });

  it("fails with validation category, never running past parseAction, on bad input", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "real-user-1", email: "a@example.com", emailConfirmedAt: null });
    const store = new Map<string, Widget>();

    const result = await createWidgetAction({ name: "" }, { store });

    expect(result).toMatchObject({ success: false, error: { category: "validation" } });
    expect(store.size).toBe(0);
  });

  it("propagates a downstream domain error (e.g. a repository NotFoundError) as domain category", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "real-user-1", email: "a@example.com", emailConfirmedAt: null });
    const { executeAction } = await import("./execute");
    const { requireActionUser } = await import("./context");

    const result = await executeAction("archiveWidget", async () => {
      await requireActionUser();
      throw new NotFoundError("Widget nope not found for owner real-user-1");
    });

    expect(result).toMatchObject({ success: false, error: { category: "domain" } });
  });
});
