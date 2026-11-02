import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { skillPath } from "../apps/client/src/skill-path";

describe("element skill paths", () => {
  const from = new Vector3(0, 1, 2.4),
    to = new Vector3(2.9, 0.6, -2.4);
  const ELEMENTS = ["Flame", "Tide", "Grove", "Stone", "Storm", "Frost", "Light", "Shadow"];

  it("starts at the caster and lands on the target for every element", () => {
    for (const e of ELEMENTS) {
      expect(skillPath(e, from, to, 0).distanceTo(from), e).toBeLessThan(1e-6);
      expect(skillPath(e, from, to, 1).distanceTo(to), e).toBeLessThan(1e-6);
    }
  });

  it("lobs flame and stone, dips shadow, and flies frost straight", () => {
    const mid = from.clone().lerp(to, 0.5);
    expect(skillPath("Stone", from, to, 0.5).y).toBeGreaterThan(skillPath("Flame", from, to, 0.5).y);
    expect(skillPath("Flame", from, to, 0.5).y).toBeGreaterThan(mid.y + 1);
    expect(skillPath("Shadow", from, to, 0.5).y).toBeLessThan(mid.y);
    expect(skillPath("Frost", from, to, 0.5).distanceTo(mid)).toBeLessThan(1e-6);
    expect(skillPath("", from, to, 0.3).distanceTo(from.clone().lerp(to, 0.3))).toBeLessThan(1e-6);
  });

  it("swerves storm and tide off the straight line", () => {
    for (const e of ["Storm", "Tide", "Grove"]) {
      const off = [0.2, 0.35, 0.6].map((k) => skillPath(e, from, to, k).distanceTo(from.clone().lerp(to, k)));
      expect(Math.max(...off), e).toBeGreaterThan(0.15);
    }
  });

  it("stays finite when a creature targets itself", () => {
    const p = skillPath("Storm", from, from, 0.4);
    expect([p.x, p.y, p.z].every(Number.isFinite)).toBe(true);
  });
});
