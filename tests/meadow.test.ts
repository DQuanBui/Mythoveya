import { expect, it } from "vitest";
import {
  MEADOW_EXTENT,
  MEADOW_STOPS,
  MEADOW_PATHS,
  MEADOW_POND,
  MEADOW_WILDLIFE,
  MEADOW_BUILDINGS,
  meadowWalkable,
  meadowHeight,
} from "../packages/shared/meadow";
import { buildGrid, findPath, lineClear } from "../packages/shared/pathfind";
it("connects every Whisperleaf stop around the lake and mountain obstacles", () => {
  const grid = buildGrid(meadowWalkable, MEADOW_EXTENT);
  for (const s of MEADOW_STOPS) {
    expect(meadowWalkable(...s.point), s.name).toBe(true);
    const path = findPath(grid, [0, 5], s.point, meadowWalkable);
    expect(path, s.name).not.toBeNull();
    let prev: [number, number] = [0, 5];
    for (const p of path!) {
      expect(lineClear(prev, p, meadowWalkable), s.name).toBe(true);
      prev = p;
    }
    expect(Math.hypot(prev[0] - s.point[0], prev[1] - s.point[1])).toBeLessThan(
      1,
    );
  }
});
it("places wildlife on open ground and levels each building foundation", () => {
  for (const s of MEADOW_WILDLIFE)
    expect(meadowWalkable(...s.point), s.species).toBe(true);
  for (const b of MEADOW_BUILDINGS)
    for (const dx of [-b.width / 2, b.width / 2])
      for (const dz of [-b.depth / 2, b.depth / 2]) {
        expect(meadowHeight(b.x + dx, b.z + dz)).toBe(meadowHeight(b.x, b.z));
      }
});
it("keeps signed trails clear and slopes gentle, while blocking the lake", () => {
  for (const path of MEADOW_PATHS)
    for (let i = 1; i < path.length; i++)
      for (let t = 0; t <= 1; t += 0.025) {
        const x = path[i - 1][0] * (1 - t) + path[i][0] * t,
          z = path[i - 1][1] * (1 - t) + path[i][1] * t;
        expect(meadowWalkable(x, z), `${x},${z}`).toBe(true);
        expect(
          Math.abs(meadowHeight(x, z + 0.1) - meadowHeight(x, z - 0.1)) / 0.2,
        ).toBeLessThan(0.46);
      }
  expect(meadowWalkable(MEADOW_POND.x, MEADOW_POND.z)).toBe(false);
  expect(meadowHeight(0, -34)).toBe(3);
  expect(new Set(MEADOW_STOPS.map((s) => s.id)).size).toBe(MEADOW_STOPS.length);
});
