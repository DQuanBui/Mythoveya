import { describe, expect, it } from "vitest";
import { FIELD_HOUSES, FIELD_NODES, GUARDIAN_POINT, MILL_POINT, WILDWOOD_PLACES, discoveryWindow, expeditionOf } from "../packages/shared/wildwood";
import { havenWalkable, groundHeight } from "../packages/shared/haven";
import { buildGrid, findPath, lineClear } from "../packages/shared/pathfind";
import { DAY_CYCLE_MS, worldHour } from "../packages/shared/world-time";
import type { Profile } from "../packages/shared/types";

describe("western Havenreach", () => {
  it("connects every expedition stop without crossing lake or house walls", () => {
    expect(havenWalkable(-49, 12)).toBe(false);
    expect(groundHeight(-61, 1)).toBeGreaterThan(3);
    for (const h of FIELD_HOUSES) expect(havenWalkable(...h.point)).toBe(false);
    const grid = buildGrid(havenWalkable, 78);
    for (const target of [...FIELD_HOUSES.map((h) => h.door), ...FIELD_NODES.map((n) => [...n.point] as [number, number]), ...WILDWOOD_PLACES.map((p) => p.point), MILL_POINT, GUARDIAN_POINT]) {
      expect(havenWalkable(...target), String(target)).toBe(true);
      const path = findPath(grid, [0, 5], target, havenWalkable);
      expect(path, String(target)).toBeTruthy();
      let from: [number, number] = [0, 5];
      for (const step of path!) { expect(lineClear(from, step, havenWalkable)).toBe(true); from = step; }
      expect(Math.hypot(from[0] - target[0], from[1] - target[1])).toBeLessThan(0.5);
    }
  });
  it("reads legacy saves without mutation and shares the actual day/night schedule", () => {
    const p = {} as Profile;
    expect(expeditionOf(p).restored).toBe(false);
    expect(p.expedition).toBeUndefined();
    expect(worldHour(0)).toBe(6);
    expect(worldHour(DAY_CYCLE_MS * 0.65)).toBe(18);
    expect(discoveryWindow("starglass", 0)).toBe(false);
    expect(discoveryWindow("starglass", DAY_CYCLE_MS * 0.8)).toBe(true);
    expect(discoveryWindow("forged", Date.now())).toBe(false);
  });
});
