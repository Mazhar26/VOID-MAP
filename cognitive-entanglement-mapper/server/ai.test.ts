import { describe, expect, it } from "vitest";
import { discoverHiddenConnections, extractConceptsFromText } from "./ai";

describe("AI fallback contracts", () => {
  it("returns no hidden Entanglements when fewer than two concepts are available", async () => {
    const result = await discoverHiddenConnections([{ id: 1, title: "Systems thinking", description: null, category: "skill", tags: [] }], new Set());
    expect(result.suggestions).toEqual([]);
  });

  it("normalizes fallback-extracted concepts with supported categories", async () => {
    const result = await extractConceptsFromText("I build accessible interfaces with TypeScript, explore jazz composition, and lead workshop design.");
    expect(result.concepts.length).toBeGreaterThan(0);
    expect(result.concepts.every(concept => ["skill", "interest", "project", "idea"].includes(concept.category))).toBe(true);
  });
});
