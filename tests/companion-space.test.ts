import { describe, expect, it } from "vitest";
import { ALL_SPECIES } from "../packages/shared/content";
import { createCreature } from "../apps/client/src/models";
import { ASIDE_SPEED, bodyReach, personalSpace, stepAside } from "../apps/client/src/companion-space";

describe("companion personal space", () => {
  it("gives big creatures more room than small ones", () => {
    const reaches = ALL_SPECIES.map((s) => bodyReach(createCreature(s.id)));
    const small = Math.min(...reaches),
      big = Math.max(...reaches);
    expect(big).toBeGreaterThan(small);
    expect(personalSpace(big, false).min).toBeGreaterThan(personalSpace(small, false).min);
  });
  it("keeps every creature's body clear of the keeper at its closest (wingtips may brush)", () => {
    for (const s of ALL_SPECIES) {
      const reach = bodyReach(createCreature(s.id)),
        { min, follow } = personalSpace(reach, true);
      expect(min).toBeGreaterThan(0.32 + reach * 0.5);
      expect(follow).toBeGreaterThan(min);
    }
  });
  it("stays a little closer at night, but never inside its space", () => {
    const day = personalSpace(0.6, false),
      night = personalSpace(0.6, true);
    expect(night.follow).toBeLessThan(day.follow);
    expect(night.min).toBe(day.min);
  });
});
describe("stepAside", () => {
  it("does nothing with room to spare", () => {
    expect(stepAside(2, 0, 1, 0.016)).toBeNull();
  });
  it("backs away from the keeper and veers aside, a little each frame", () => {
    // Keeper at +x from the companion: the companion moves towards -x, and sideways.
    const [x, z] = stepAside(0.5, 0, 1, 0.016)!;
    expect(x).toBeLessThan(0);
    expect(Math.abs(z)).toBeGreaterThan(0);
    expect(Math.hypot(x, z)).toBeCloseTo(0.016 * ASIDE_SPEED);
  });
  it("moves faster than a walking keeper", () => {
    expect(ASIDE_SPEED).toBeGreaterThan(5);
  });
  it("never overshoots its space, and gets out from right on top", () => {
    expect(Math.hypot(...stepAside(0.99, 0, 1, 1)!)).toBeCloseTo(0.01);
    expect(Math.hypot(...stepAside(0, 0, 1, 0.016)!)).toBeGreaterThan(0);
  });
});
