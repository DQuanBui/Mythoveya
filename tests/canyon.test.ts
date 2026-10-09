import { expect, it } from "vitest";
import {
  CANYON_BEACONS,
  CANYON_EXTENT,
  CANYON_PATHS,
  CANYON_SPRINGS,
  CANYON_STOPS,
  canyonHeight,
  canyonOf,
  canyonWalkable,
} from "../packages/shared/canyon";
import { buildGrid, findPath, lineClear } from "../packages/shared/pathfind";
import type { Profile } from "../packages/shared/types";
it("connects every canyon stop to camp without crossing water or solid scenery", () => {
  const grid = buildGrid(canyonWalkable, CANYON_EXTENT);
  for (const s of CANYON_STOPS) {
    expect(canyonWalkable(...s.point), s.name).toBe(true);
    const route = findPath(grid, [0, 5], s.point, canyonWalkable);
    expect(route, s.name).not.toBeNull();
    let previous: [number, number] = [0, 5];
    for (const step of route!) {
      expect(lineClear(previous, step, canyonWalkable), s.name).toBe(true);
      previous = step;
    }
    expect(
      Math.hypot(previous[0] - s.point[0], previous[1] - s.point[1]),
    ).toBeLessThan(1);
  }
});
it("keeps trails graded, springs blocked and old saves unchanged", () => {
  for (const p of CANYON_PATHS)
    for (let i = 1; i < p.length; i++)
      for (let t = 0; t <= 1; t += 0.05) {
        const x = p[i - 1][0] * (1 - t) + p[i][0] * t,
          z = p[i - 1][1] * (1 - t) + p[i][1] * t;
        expect(canyonWalkable(x, z), `${x},${z}`).toBe(true);
        expect(
          Math.abs(canyonHeight(x + 0.1, z) - canyonHeight(x - 0.1, z)) / 0.2,
        ).toBeLessThan(0.5);
      }
  for (const p of CANYON_SPRINGS) expect(canyonWalkable(p.x, p.z)).toBe(false);
  const old = {} as Profile;
  expect(canyonOf(old).beacons).toEqual([]);
  expect(old.canyon).toBeUndefined();
  expect(new Set(CANYON_STOPS.map((s) => s.id)).size).toBe(CANYON_STOPS.length);
  expect(
    CANYON_BEACONS.every(
      (n) => n.code.length === 3 && n.code.every((c) => c >= 0 && c <= 2),
    ),
  ).toBe(true);
});
