import { describe, expect, it } from "vitest";
import { getHoldDuration, getWordRevealDelay } from "../client/src/components/Immersive";

describe("immersive interaction safety helpers", () => {
  it("keeps hold confirmation duration at a usable minimum", () => {
    expect(getHoldDuration(0)).toBe(250);
    expect(getHoldDuration(1000)).toBe(1000);
    expect(getHoldDuration(-1)).toBe(250);
  });

  it("never creates negative word reveal delays", () => {
    expect(getWordRevealDelay(-2)).toBe("0ms");
    expect(getWordRevealDelay(0)).toBe("0ms");
    expect(getWordRevealDelay(3)).toBe("165ms");
  });
});
