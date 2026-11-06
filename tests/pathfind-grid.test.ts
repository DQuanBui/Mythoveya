import { describe, expect, it } from "vitest";
import { buildGrid, startGrid } from "../packages/shared/pathfind";
import { havenWalkable } from "../packages/shared/haven";

describe("walk grid slices", () => {
  it("builds the same grid a row at a time as all at once", () => {
    const whole = buildGrid(havenWalkable, 20),
      build = startGrid(havenWalkable, 20);
    let steps = 1;
    while (!build.step(() => false)) steps++;
    expect(steps).toBe(whole.size);
    expect(build.grid.size).toBe(whole.size);
    expect(Array.from(build.grid.open)).toEqual(Array.from(whole.open));
  });
  it("can finish in one go after some slices, and stays finished", () => {
    const whole = buildGrid(havenWalkable, 12),
      build = startGrid(havenWalkable, 12);
    expect(build.step(() => false)).toBe(false);
    expect(build.step()).toBe(true);
    expect(build.step()).toBe(true);
    expect(Array.from(build.grid.open)).toEqual(Array.from(whole.open));
  });
});
