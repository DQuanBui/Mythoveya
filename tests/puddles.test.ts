import { describe, expect, it } from "vitest";
import { groundHeight, inPond, pathDistance, slopeAt } from "../packages/shared/haven";
import { puddleSpots } from "../apps/client/src/puddle-spots";

describe("rain puddles", () => {
  it("collect only on level trail ground, clear of the pond and of each other", () => {
    const spots = puddleSpots(40);
    expect(spots.length).toBeGreaterThan(15);
    for (const s of spots) {
      expect(pathDistance(s.x, s.z)).toBeLessThanOrEqual(1.1);
      expect(slopeAt(s.x, s.z)).toBeLessThanOrEqual(0.06);
      expect(groundHeight(s.x, s.z)).toBeLessThanOrEqual(2);
      expect(inPond(s.x, s.z, 1.5)).toBe(false);
    }
    for (const a of spots) for (const b of spots) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(3);
  });
});
