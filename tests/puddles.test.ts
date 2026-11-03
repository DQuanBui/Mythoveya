import { describe, expect, it } from "vitest";
import { groundHeight, inPond, pathDistance, slopeAt } from "../packages/shared/haven";
import { inPuddle, puddleSpots, puddles } from "../apps/client/src/puddle-spots";

describe("rain puddles", () => {
  it("collect only on level trail ground, clear of the pond and of each other", () => {
    const spots = puddleSpots(40);
    expect(spots.length).toBeGreaterThan(15);
    for (const s of spots) {
      expect(pathDistance(s.x, s.z)).toBeLessThanOrEqual(1.1);
      expect(slopeAt(s.x, s.z)).toBeLessThanOrEqual(0.06);
      expect(groundHeight(s.x, s.z)).toBeLessThanOrEqual(2);
      expect(s.y).toBe(groundHeight(s.x, s.z));
      expect(inPond(s.x, s.z, 1.5)).toBe(false);
    }
    for (const a of spots) for (const b of spots) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(3);
  });

  it("splash only where a puddle holds water", () => {
    puddles.spots = puddleSpots(40);
    const s = puddles.spots[0];
    puddles.wet = 0;
    expect(inPuddle(s.x, s.z)).toBe(false);
    puddles.wet = 1;
    expect(inPuddle(s.x, s.z)).toBe(true);
    expect(inPuddle(s.x + 5, s.z + 5)).toBe(puddles.spots.some((p) => Math.hypot((s.x + 5 - p.x) / 1.3, s.z + 5 - p.z) < p.size));
  });
});
