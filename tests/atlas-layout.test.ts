import { ATLAS_CHAPTERS, ATLAS_PATHS, atlasStops, atlasBlocked, atlasProp } from "../packages/shared/atlas";
import { expect, it } from "vitest";
import {
  conservancyBlocked,
} from "../packages/shared/conservancy";
import { havenWalkable, groundHeight } from "../packages/shared/haven";
import { meadowWalkable, meadowHeight } from "../packages/shared/meadow";
import { canyonWalkable, canyonHeight } from "../packages/shared/canyon";
import { hollowWalkable, hollowHeight } from "../packages/shared/hollow";
import { rallyBlocked } from "../packages/shared/rally";
import { buildGrid, findPath } from "../packages/shared/pathfind";
it("keeps every archive and tablet reachable with clear connecting paths", () => {
  const rules = [
    [havenWalkable, groundHeight, 78],
    [meadowWalkable, meadowHeight, 46],
    [canyonWalkable, canyonHeight, 52],
    [hollowWalkable, hollowHeight, 52],
  ] as const;
  ATLAS_CHAPTERS.forEach((h, i) => {
    const [base, ground, extent] = rules[i],
      walk = (x: number, z: number) =>
        base(x, z) &&
        !rallyBlocked(h.region, x, z) &&
        !conservancyBlocked(h.region, x, z) && !atlasBlocked(h.region,x,z),
      grid = buildGrid(walk, extent);
    for (const s of atlasStops(h.region)) {
      expect(walk(...s.point), s.name + " approach").toBe(true);
      expect(
        findPath(grid, [0, 5], s.point, walk),
        s.name + " route",
      ).not.toBeNull();
    }
    for (const path of ATLAS_PATHS[h.region])
      for (let i = 1; i < path.length; i++)
        for (let t = 0; t <= 1; t += 0.05) {
          const a = path[i - 1],
            b = path[i],
            x = a[0] * (1 - t) + b[0] * t,
            z = a[1] * (1 - t) + b[1] * t;
          expect(walk(x, z), `${h.region} path ${x},${z}`).toBe(true);
        }
    const [x, z] = atlasProp(h);
    expect(base(x, z), h.region + " foundation").toBe(true);
    expect(
      Math.abs(ground(x - 1, z) - ground(x + 1, z)),
      h.region + " foundation slope",
    ).toBeLessThan(1);

  });
});
