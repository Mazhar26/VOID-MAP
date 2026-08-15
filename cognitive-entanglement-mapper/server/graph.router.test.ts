import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = {
  getGraph: vi.fn(),
  createConcept: vi.fn(),
  updateConcept: vi.fn(),
  deleteConcept: vi.fn(),
  saveConceptPositions: vi.fn(),
  createEntanglement: vi.fn(),
  updateEntanglement: vi.fn(),
  deleteEntanglement: vi.fn(),
  saveInsight: vi.fn(),
  updateInsightStatus: vi.fn(),
};

vi.mock("./db", () => db);

const ai = {
  discoverHiddenConnections: vi.fn(),
  extractConceptsFromText: vi.fn(),
  exploreSuperposition: vi.fn(),
};

vi.mock("./ai", () => ai);

const { appRouter } = await import("./routers");

function contextFor(userId: number | null): TrpcContext {
  return {
    user: userId === null ? null : {
      id: userId,
      openId: `user-${userId}`,
      name: "Graph User",
      email: "graph@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const conceptInput = {
  title: "Systems thinking",
  description: "A way to see patterns across a whole field.",
  category: "skill" as const,
  confidence: 84,
  tags: ["strategy"],
  urls: ["https://example.com/systems"],
};

describe("protected graph router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("binds concept mutation calls to the authenticated user's id", async () => {
    db.createConcept.mockResolvedValue({ id: 55, ...conceptInput });
    const caller = appRouter.createCaller(contextFor(41));

    await caller.graph.createConcept(conceptInput);

    expect(db.createConcept).toHaveBeenCalledWith(41, expect.objectContaining({ title: "Systems thinking", category: "skill" }));
  });

  it("binds destructive graph operations to the authenticated user's id", async () => {
    db.deleteConcept.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(contextFor(41));

    await caller.graph.deleteConcept({ id: 55 });

    expect(db.deleteConcept).toHaveBeenCalledWith(41, 55);
  });

  it("rejects graph access without an authenticated user", async () => {
    const caller = appRouter.createCaller(contextFor(null));

    await expect(caller.graph.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.getGraph).not.toHaveBeenCalled();
  });
});
